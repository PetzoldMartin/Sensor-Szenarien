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
                turnOffTimerModuleId: -1,
                personCount: 0,
                adultCount: 0,
                childCount: 0,
                turnOffTimerState: 'pause'
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
                // first check the state of turn off timer
                if(vDev.get('metrics:turnOffTimerState') === 'pause') {
                    vDev.set('metrics:turnOffTimerState', 'active');

                    var turnOffTimerDuration = 60; // default
                    if(self.config.turnOffTimerDuration) {
                        var turnOffTimerDuration = self.config.turnOffTimerDuration;
                    }

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
                        vDev.set('metrics:turnOffTimerState', 'pause');
                    });

                    // if turn off timer canceled
                    self.controller.devices.on(vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {
                        self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {});
                        // don't turn off any hazards
                        self.addHistoryEntry('A shutdown of hazards has been canceled by a user.');
                        vDev.set('metrics:turnOffTimerState', 'pause');
                    });

                    // unsubscribe event's after the double time of timer duration (in the case that the turn off timer module does not work properly)
                    self.unsubscribeEvents = setTimeout(function() {
                        self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_expired", function() {});
                        self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {});
                        vDev.set('metrics:turnOffTimerState', 'pause');
                    }, turnOffTimerDuration * 2 * 1000);

                    // send a response: all OK ...
                    return {
                        'code': 1,
                        'message': 'The mechanism for harzard off command started normally.'
                    }
                } else {
                    // send a response
                    return {
                        'code': 2,
                        'message': 'The mechanism for harzard off command can be started only once.'
                    }
                }
			} else if (command === "state") {
                var storedHistory = loadObject(self.vDev.id);

                return {
                    'code': 1,
                    'message': 'OK',
                    'state': {
                        'metrics': vDev.get('metrics'),
                        'history': storedHistory
                    }
                }
            } else if (command === "history") {
                var storedHistory = loadObject(self.vDev.id);

                return {
                    'code': 1,
                    'message': 'OK',
                    'history': storedHistory
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
        // Setup TurnOffTimerModule
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

                    // TODO - this was initially a test, but it could also be a functionality
                    // if(personCount < 1) {
                    //     self.vDev.performCommand("hazardOff");
                    // }

                    // store person count
                    vDev.set('metrics:personCount', personCount);
                }
            });
        } else {
            // TODO - no PersonCounterModule found in current room, possibly notify the user
        }

        // // Subscribe PersonIdentificationModule events (PersonIdentificationModule of this room)
        self.personIdentificationDeviceId = self.getPersonIdentificationDeviceId(self.config.room);
        if (self.personIdentificationDeviceId) {
            self.controller.devices.on(self.personIdentificationDeviceId, 'PersonIdentificationModule_' + self.config.room + '_no_adult_there', function() {
                // no adult in room
                self.vDev.performCommand("hazardOff");

                // update own metric values
                var personIdentificationVDev = self.controller.devices.get(self.personIdentificationDeviceId);

                if(personIdentificationVDev) {
                    var personCount = personIdentificationVDev.get("metrics:personCount");
                    var adultCount = personIdentificationVDev.get("metrics:adultCount");

                    // store new metric values for person count, adult count, child count
                    vDev.set('metrics:personCount', personCount);
                    vDev.set('metrics:adultCount', adultCount);
                    vDev.set('metrics:childCount', personCount - adultCount);
                }
            });
            self.controller.devices.on(self.personIdentificationDeviceId, 'PersonIdentificationModule_' + self.config.room + '_adult_there', function() {
                // at least one adult in room
                // TODO - hazardOn?

                // update own metric values
                var personIdentificationVDev = self.controller.devices.get(self.personIdentificationDeviceId);

                if(personIdentificationVDev) {
                    var personCount = personIdentificationVDev.get("metrics:personCount");
                    var adultCount = personIdentificationVDev.get("metrics:adultCount");

                    // store new metric values for person count, adult count, child count
                    vDev.set('metrics:personCount', personCount);
                    vDev.set('metrics:adultCount', adultCount);
                    vDev.set('metrics:childCount', personCount - adultCount);
                }
            });
        } else {
            // TODO - no PersonIdentificationModule found in current room, possibly notify the user
        }
    });
};

TurnOffHazardModule.prototype.stop = function () {
    var self = this;

    // unsubscribe turn off timer events
    self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_expired", function() {});
    self.controller.devices.off(self.vDev.get('metrics:turnOffTimerModuleId'), 'TurnOffTimerModule_' + self.config.room + "_canceled", function() {});
    // unsubscribe person counter events
    if(self.personCounterDeviceId) {
        self.controller.devices.off(self.personCounterDeviceId, "change:metrics:level", function() {});
    }
    // unsubscribe person identification events
    if(self.personIdentificationDeviceId) {
        self.controller.devices.off(self.personIdentificationDeviceId, 'PersonIdentificationModule_' + self.config.room + '_no_adult_there', function() {});
        self.controller.devices.off(self.personIdentificationDeviceId, 'PersonIdentificationModule_' + self.config.room + '_adult_there', function() {});
    }

    if (self.unsubscribeEvents) {
        clearTimeout(self.unsubscribeEvents);
    }

    self.vDev.set('metrics:turnOffTimerState', 'pause');

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

    // add history data also if no hazard configured
    self.addHistoryEntry('A shutdown of hazards has been successfully performed.');
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

TurnOffHazardModule.prototype.getPersonIdentificationDeviceId = function (roomId) {
    var self = this;
    var deviceId = null;

    self.controller.instances.forEach(function(instance) {
        if(instance.moduleId === 'PersonIdentificationModule') {
            if(instance.params.room == roomId) {
                deviceId = instance.id;
            }
        }
    });

    if (deviceId) {
        return "PersonIdentificationModule_" + deviceId; // device id
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

TurnOffHazardModule.prototype.addHistoryEntry = function (historyEntry) {
    var self = this;

    var storedHistory = loadObject(self.vDev.id);
    if (!storedHistory) {
        storedHistory = {
            deviceId: self.vDev.id,
            deviceName: self.vDev.get("metrics:title"),
            historyData: []
        };
    }
    storedHistory.historyData.push({"time": Date.now(), "data": historyEntry});
    saveObject(self.vDev.id, storedHistory);
    storedHistory = null;
}
