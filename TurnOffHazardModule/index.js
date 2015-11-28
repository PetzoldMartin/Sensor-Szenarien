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
                // start turn off timer
                var turnOffTimerModule = self.controller.devices.get(vDev.get('metrics:turnOffTimerModuleId'));
                turnOffTimerModule.performCommand('start_timer', {'time': 60});

                // if turn off timer expired
                self.controller.devices.on(vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_expired", function() {
    				self.turnOffAllHazards();
                });

                // if turn off timer canceled
                self.controller.devices.on(vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {
    				// don't turn off any hazards
                });

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

    // Wait for event core.start, which indicates, that all modules are loaded.
    // Otherwise an exception will be thrown, because the module can not be used.
    // ATTENTION!
    // This is only called when the system starts, this implies, that new modules
    // are after restarts only!
    self.controller.on("core.start", function() {
        if (vDev.get('metrics:turnOffTimerModuleId') == -1) {
            var turnOffTimerModuleId = self.createTurnOffTimerModuleIfNotExist(self.config.room);
            vDev.set('metrics:turnOffTimerModuleId', turnOffTimerModuleId);
        }
    });
};

TurnOffHazardModule.prototype.stop = function () {
    var self = this;

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

TurnOffHazardModule.prototype.createTurnOffTimerModuleIfNotExist = function (roomId) {
    var self = this;
    var existTurnOffTimerModuleInRoom = false;
    var deviceId = null;

    self.controller.instances.forEach(function(instance) {
        if(instance.moduleId === 'TurnOffTimerModul') {
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
            "moduleId": "TurnOffTimerModul",
            "active": "true",
            "title": "Turn Off Timer Modul",
            "params": {
                "room": roomId,
            }
        });
        deviceId = result.id;
    }

    // rename virtual device
    var turnOffTimerModule = self.controller.devices.get("TurnOffTimerModul_" + deviceId);
    turnOffTimerModule.set({'metrics': {'title': 'Turn Off Timer Modul (Raum ' + roomId + ')'}});

	return "TurnOffTimerModul_" + deviceId; // device id
}
