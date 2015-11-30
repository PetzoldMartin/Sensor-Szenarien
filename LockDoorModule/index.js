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
    // this.roomWithExipredTimer = new Array();
    this.roomWithTurnOffTimer.push(42);

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
                vDev.set("metrics:level", "standby finished")
                // standby mode should be finished
                self.controller.devices.emit("LockDoorModule_unlocked");

            } else if (switchVDev.get("metrics:level") == "on") {
                // standby mode should be started
                vDev.set("metrics:level", "time to enter standby");

                self.peoplePresent = false;

                // check all PersonCounter
                self.controller.devices.forEach(function(vDev){
                    self.checkPersonCountersAndStartTurnOffTimer(vDev);
                });

                if (self.peoplePresent) {
                    vDev.set("metrics:level", "standby imposible, there are people present");
                    // notify user
                } else {

                    // start feedback module
                    // start timer
                }

                // if PersonCounter > 0
                    // stop activity (do nothing, notify user)
                // if PersonCounter == 0
                    // start timer

                // self.controller.devices.emit(vDev.deviceId + ':door_lock_module_locked');
                self.controller.devices.emit("LockDoorModule_locked");
            }
            console.log("ROOMS WITH TURN OFF TIMER: " + self.roomWithTurnOffTimer);
            // console.log("LockDoorModule DEVID: " + vDev.deviceId);
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
    // if (vDev.id.indexOf('PersonCounter') != -1 ){
    if (vDev.id.indexOf("DummyDevice_35") != -1 ) {
        var persons = vDev.get("metrics:level");
        // var persons = vDev.performCommand('persons');
        var currentRoomId = vDev.get('metrics:roomId');
        if (persons > 0) {
            this.peoplePresent = true;
        } else {
            // start timer for all rooms with personCounter
            self.manageTurnOffTimerForRoom(currentRoomId);
        }
    }
    // subscribe for counter expired events
    if (this.roomWithTurnOffTimer.length > 0) {
        for (var i = 0; i < this.roomWithTurnOffTimer.length; i++) {
            var rommId = this.roomWithTurnOffTimer[i];
            self.controller.devices.on();
        }
    }
};

LockDoorModule.prototype.manageTurnOffTimerForRoom = function (currentRoomId) {
    turnOffTimerModuleId = this.createTurnOffTimerModuleIfNotExist(currentRoomId);

    var turnOffTimer =  self.controller.devices.get(turnOffTimerModuleId);
    turnOffTimer.performCommand('start_timer', {'time': 60});

    self.roomWithTurnOffTimer.push(currentRoomId);

    self.controller.devices.on(turnOffTimerModuleId, 'TurnOffTimerModule_' + currentRoomId + "_expired", function() {
        // no person in this one room
        var index = self.roomWithTurnOffTimer.indexOf(currentRoomId);
        if (index > -1) {
            self.roomWithTurnOffTimer.spice(index, 1);
            //TODO
        }
    });

    // if turn off timer canceled
    self.controller.devices.on(turnOffTimerModuleId, 'TurnOffTimerModule_' + currentRoomId + "_canceled", function() {
        // there are persons in the room, don't send an event
    });
}

LockDoorModule.prototype.createTurnOffTimerModuleIfNotExist = function (roomId) {
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
