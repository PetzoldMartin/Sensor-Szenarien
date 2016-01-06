/* Module to set smart home in standby mode
 *
 * Version: 0.1.0
 * 2015
 *
 * Author: Simon Schwabe <sis111su@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function LockDoorModule (id, controller) {
    LockDoorModule.super_.call(this, id, controller);
}

inherits(LockDoorModule, AutomationModule);

_module = LockDoorModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

LockDoorModule.prototype.init = function (config) {
    LockDoorModule.super_.prototype.init.call(this, config);

    var self = this;
    this.roomWithTurnOffTimer = new Array();

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "LockDoorModule_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'LockDoorModule',
                level: ''
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'switchBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/LockDoorModule/icon.png"
			}
        },
        moduleId: this.id
    });

    // get the configured switch and add listener function
    var switchVDevId = self.config.doorLock;

    if (!switchVDevId) {
        switchVDevId = self.config.switch;
    }
    if(switchVDevId) {
        self.controller.devices.on(switchVDevId, "change:metrics:level", function() {
            var switchVDev = self.controller.devices.get(switchVDevId);
            if (switchVDev.get("metrics:level") == "off") {
                vDev.set("metrics:level", "not in standby")
                // standby mode should be finished
                self.controller.devices.emit("LockDoorModule_unlocked");

            } else if (switchVDev.get("metrics:level") == "on") {
                // standby mode should be started
                vDev.set("metrics:level", "time to enter standby");
				// self.controller.devices.emit("LockDoorModule_locked");
                self.peoplePresent = false;

                // check all PersonCounter
                self.controller.devices.forEach(function(vDev){
                    self.checkPersonCountersAndStartTurnOffTimer(vDev);
                });

                if (self.peoplePresent) {
                    vDev.set("metrics:level", "standby imposible, there are people present");
                    // notify user
                }
            }
        });
    }
};

LockDoorModule.prototype.stop = function () {
    this.controller.devices.remove("LockDoorModule_" + this.id);

    LockDoorModule.super_.prototype.stop.call(this);
};

// checks all PersonCounters, starts timer, if nobody is present
LockDoorModule.prototype.checkPersonCountersAndStartTurnOffTimer = function (vDev) {
    self = this;
    if (vDev.id.indexOf('PersonCounter') != -1 ){
    // if (vDev.id.indexOf("DummyDevice_35") != -1 ) {
        // var persons = vDev.get("metrics:level");
        var persons = vDev.performCommand('persons');
        var currentRoomId = vDev.get('metrics:room');
        if (persons > 0) {
            this.peoplePresent = true;
        } else {
            // start timer for all rooms with personCounter
            self.manageTurnOffTimerForRoom(currentRoomId, vDev);
        }
    }
    // subscribe for counter expired events
    if (this.roomWithTurnOffTimer.length > 0) {
        for (var i = 0; i < this.roomWithTurnOffTimer.length; i++) {
            var roomId = this.roomWithTurnOffTimer[i];
            // self.controller.devices.on();
            // TODO
        }
    }
};

LockDoorModule.prototype.manageTurnOffTimerForRoom = function (currentRoomId) {
    var self = this;
    var turnOffTimerModuleId = this.createTurnOffTimerModuleIfNotExist(currentRoomId);
    if (turnOffTimerModuleId) {
        var turnOffTimer =  self.controller.devices.get(turnOffTimerModuleId);

        turnOffTimer.performCommand('start_timer', {'time': 15, 'priority': 1});
        this.roomWithTurnOffTimer.push(currentRoomId);

        this.controller.devices.on(turnOffTimerModuleId, 'TurnOffTimerModule_' + currentRoomId + "_expired", function() {
            self.controller.devices.off(turnOffTimerModuleId, 'TurnOffTimerModule_' + currentRoomId + "_expired", function(){});
            // no person in this one room
            var index = self.roomWithTurnOffTimer.indexOf(currentRoomId);
            if (index > -1) {
                self.roomWithTurnOffTimer.splice(index, 1);
                if (self.roomWithTurnOffTimer.length == 0) {
                    // all started are expired => no person at home
                    self.controller.devices.emit("LockDoorModule_locked");
                }
            }
        });
    }

    // if turn off timer canceled
    this.controller.devices.on(turnOffTimerModuleId, 'TurnOffTimerModule_' + currentRoomId + "_canceled", function() {
        self.controller.devices.off(turnOffTimerModuleId, 'TurnOffTimerModule_' + currentRoomId + "_canceled", function(){});
        // there are persons in the room, don't send an event
    });

    // unsubscribe from all subsriptions after 5 mins
    setTimeout(function () {
        self.controller.devices.off(turnOffTimerModuleId, 'TurnOffTimerModule_' + currentRoomId + "_canceled", function(){});
        self.controller.devices.off(turnOffTimerModuleId, 'TurnOffTimerModule_' + currentRoomId + "_expired", function(){});
    }, 60 * 5 * 1000);
}

// This creates a TurnOffTimer only if the room has a InHomeFeedbackModule associated.
// Returns the Id of the existing or created TurnOffTimer. If the room has no
// InHomeFeedbackModule, it returns nothing.
LockDoorModule.prototype.createTurnOffTimerModuleIfNotExist = function (roomId) {
    var self = this;
    var existTurnOffTimerModuleInRoom = false;
    var deviceId = null;

    var roomHasFeedbackModule = false;
    self.controller.devices.forEach(function(vDev) {
        if (vDev.id.indexOf('InHomeFeedbackModule') != -1 ) {
            var room = vDev.get("metrics:roomId");
            if (room == roomId) {
                roomHasFeedbackModule = true;
            }
        }
    });

    self.controller.instances.forEach(function(instance) {
        if(instance.moduleId === 'TurnOffTimerModule') {
            if(instance.params.room == roomId) {
                existTurnOffTimerModuleInRoom = true;
                deviceId = instance.id;
            }
        }
    });

    if (roomHasFeedbackModule) {
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
}
