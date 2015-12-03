/* Turn Off Hazard module
 *
 * Version: 1.0.0
 * 2015
 *
 * Author: Tobias Weise <Tobias.Weise.1em@fh-zwickau.de>, Patrick Hecker <pah111kg@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TurnOffHazardModule (id, controller) {
    // Call superconstructor first (AutomationModule)
    TurnOffHazardModule.super_.call(this, id, controller);
}

inherits(TurnOffHazardModule, AutomationModule);

_module = TurnOffHazardModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

TurnOffHazardModule.prototype.init = function (config) {
    TurnOffHazardModule.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "TurnOffHazardModule_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'Turn Off Hazard Module ' + this.id,
                turnOffTimerModuleId: -1
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        overlay: {
            deviceType: "turnOffHazardModule", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/TurnOffHazardModule/icon.png"
			}
        },
        handler: function (command, args) { // processing of incoming commands over ZAutomation API
            if(command === "hazardOff") {
                var turnOffTimerDuration = 60;

                // start turn off timer
                var turnOffTimerModule = self.controller.devices.get(vDev.get('metrics:turnOffTimerModuleId'));
                if(turnOffTimerModule)
                    turnOffTimerModule.performCommand('start_timer', {'time': turnOffTimerDuration});
                else {
                    self.controller.addNotification("warning", "TurnOffTimerModule need a restart of ZWay Server.", "module", "TurnOffTimerModule");
                }

                // if turn off timer expired
                self.controller.devices.on(vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_expired", function() {
                    self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_expired", function() {});
                    self.turnOffAllHazards();
                });

                // if turn off timer canceled
                self.controller.devices.on(vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {
                    self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {});
                    // don't turn off any hazards
                });

                // unsubscribe event's after the double time off timer time (in the case that the turn off timer module does not work properly)
                self.unsubscribeEvents = setTimeout(function() {
                    self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_expired", function() {});
                    self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {});
                }, turnOffTimerDuration * 2 * 1000);

                // send a response: all OK ...
                return {
                    'code': 1,
                    'message': 'OK'
                }
			} else {
                return {
                    'code': 2,
                    'message': 'Error - command not allowed'
                }
            }
        },
        moduleId: this.id
    });

    self.vDev = vDev;

    // Wait for event core.start, which indicates, that all modules are loaded.
    // Otherwise an exception will be thrown, because the module can not be used.
    // ATTENTION!
    // This is only called when the system starts, this implies, that new modules
    // are after restarts only!
    self.controller.on("core.start", function() {
        if (vDev.get('metrics:turnOffTimerModuleId') == -1) {
            var turnOffTimerModuleId = self.createTurnOffTimerModuleIfNotExist(self.config.room);
            vDev.set('metrics:turnOffTimerModuleId', turnOffTimerModuleId);
        } else {
            var turnOffTimerModule = self.controller.devices.get(vDev.get('metrics:turnOffTimerModuleId'));
            if(!turnOffTimerModule) {
                vDev.set('metrics:turnOffTimerModuleId', -1);
                self.controller.addNotification("warning", "TurnOffTimerModule need a restart of ZWay Server.", "module", "TurnOffTimerModule");
            }
        }

        // Subscribe PersonCounterModule events (PersonCounterModule of this room)
        self.personCounterDeviceId = self.getPersonCounterDeviceId(self.config.room);
        if (self.personCounterDeviceId) {
            self.controller.devices.on(self.personCounterDeviceId, "change:metrics:level", function() {
                var personCounterVDev = self.controller.devices.get(self.personCounterDeviceId);

                if (personCounterVDev) {
                    var personCount = personCounterVDev.get("metrics:level");

                    if(personCount < 1) {
                        self.vDev.performCommand("hazardOff");
                    }
                }
            });
        } else {
            // TODO
        }
    });
};

TurnOffHazardModule.prototype.stop = function () {
    var self = this;

    self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_expired", function() {});
    self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {});
    if(self.personCounterDeviceId) { // TODO
        self.controller.devices.off(self.personCounterDeviceId, "change:metrics:level", function() {});
    }

    if (self.unsubscribeEvents) {
        clearTimeout(self.unsubscribeEvents);
    }

    this.controller.devices.remove("TurnOffHazardModule_" + this.id);

    TurnOffHazardModule.super_.prototype.stop.call(this);
};

TurnOffHazardModule.prototype.turnOffAllHazards = function () {
    var self = this;

    self.config.hazards.forEach(function(el) {
        var vDev = self.controller.devices.get(el);

        if (vDev) {
            var deviceType = vDev.get("deviceType");

            if (deviceType === "switchBinary") {
                vDev.performCommand("off");
            } else if (deviceType === "switchMultilevel") {
                vDev.performCommand("exact", { level: 0 });
            }
        }
    });
}

TurnOffHazardModule.prototype.getPersonCounterDeviceId = function (roomId) {
    var self = this;
    var deviceId = null;

    self.controller.instances.forEach(function(instance) {
        if(instance.moduleId === 'PersonCounterModule') {
            if(instance.params.room == roomId) {
                deviceId = instance.id;
            }
        }
    });

    if (deviceId) {
        return "PersonCounterModule_" + deviceId; // device id
    } else {
        return null;
    }
}

TurnOffHazardModule.prototype.createTurnOffTimerModuleIfNotExist = function (roomId) {
    var self = this;
    var existTurnOffTimerModuleInRoom = false;
    var deviceId = null;

    self.controller.instances.forEach(function(instance) {
        if(instance.moduleId === 'TurnOffTimerModule') {
            if(instance.params.room == roomId) {
                existTurnOffTimerModuleInRoom = true;
                deviceId = instance.id;
            }
        }
    });

    if(!existTurnOffTimerModuleInRoom) {
        // create a new module (instance)
        var result = self.controller.createInstance({
            "instanceId": "0",
            "moduleId": "TurnOffTimerModule",
            "active": "true",
            "title": "Turn Off Timer Module",
            "params": {
                "room": roomId,
            }
        });
        deviceId = result.id;
    }

    // rename virtual device
    var turnOffTimerModule = self.controller.devices.get("TurnOffTimerModule_" + deviceId);
    var oldMetrics = turnOffTimerModule.get('metrics');
    oldMetrics.title = 'Turn Off Timer Module (Room ' + roomId + ')';
    turnOffTimerModule.set(oldMetrics);

	return "TurnOffTimerModule_" + deviceId; // device id
}
