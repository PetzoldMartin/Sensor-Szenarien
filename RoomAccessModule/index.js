/*** RoomAccessModule module ***

Version: 1.2.3
-----------------------------------------------------------------------------
Author: Philip Laube <phl111fg@fh-zwickau.de>, Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
Description:
    Creates a room access control device
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RoomAccessModule (id, controller) {
    // Call superconstructor first (AutomationModule)
    RoomAccessModule.super_.call(this, id, controller);
}

inherits(RoomAccessModule, AutomationModule);

_module = RoomAccessModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

RoomAccessModule.prototype.init = function (config) {
    RoomAccessModule.super_.prototype.init.call(this, config);

    var self = this;

    // initialize additional libraries
    // https://github.com/trevnorris/cbuffer
    var file = "/userModules/RoomAccessModule/lib/cbuffer.js";
    var stat = fs.stat(file);
    if (stat && stat.type === "file") {
        executeFile(file);
    }

    var file = "/userModules/RoomAccessModule/lib/xdate.js";
    var stat = fs.stat(file);
    if (stat && stat.type === "file") {
        executeFile(file);
    }

    // time for checking for a transition with the second sensor in milliseconds
    self.motionSensorTime = 5000;

    self.lastEventMotionSensorOne;
    self.lastEventMotionSensorTwo;

    // init circular buffer for ultrasonic values
    self.ultrasonicValueBuffer = new CBuffer(4);
    self.ultrasonicDoorHeight = 0;
    self.ultrasonicAdjustment = 10;

    // virtuel device definition - object defines the interface for the ZAutomation API and the UI (Elements)
    var vDev = self.controller.devices.create({
        deviceId: "RoomAccessModule_" + this.id,
        defaults: {
            metrics: {
                title: 'RoomAccessModule ' + this.id,
                roomIdOne: -1,
                roomIdTwo: -1
            }
        },
        overlay: {
            deviceType: "RoomAccessModule",
            metrics: {
                icon: "/ZAutomation/api/v1/load/modulemedia/RoomAccessModule/icon.png"
            }
        },
        handler: function (command, args) {
            if(command === "getUltrasonicValueBuffer") {
                var sum = 0;
                self.ultrasonicValueBuffer.forEach(function(a) {
                    sum += a;
                });
                var avg = sum / self.ultrasonicValueBuffer.size;

                return {
                    'code': 1,
                    'message': 'OK',
                    'buffer': self.getUltrasonicValueBufferData()
                }
            } else if(command === "setUltrasonicValueBufferSize") {
                if(args.size) {
                    var newSize = parseFloat(args.size);
                    if(!isNaN(newSize)) {
                        self.ultrasonicValueBuffer = new CBuffer(newSize);

                        return {
                            'code': 1,
                            'message': 'OK'
                        }
                    } else {
                        // send a response: wrong parameter ...
                        return {
                            'code': 3,
                            'message': 'Error - parameter is not a number'
                        }
                    }
                } else {
                    // send a response: missing parameter ...
                    return {
                        'code': 2,
                        'message': 'Error - missing parameter (size)'
                    }
                }
            } else if(command === "setUltrasonicAdjustment") {
                if(args.value) {
                    var newValue = parseFloat(args.value);
                    if(!isNaN(newValue)) {
                        self.ultrasonicAdjustment = newValue;

                        return {
                            'code': 1,
                            'message': 'OK'
                        }
                    } else {
                        // send a response: wrong parameter ...
                        return {
                            'code': 3,
                            'message': 'Error - parameter is not a number'
                        }
                    }
                } else {
                    // send a response: missing parameter ...
                    return {
                        'code': 2,
                        'message': 'Error - missing parameter (value)'
                    }
                }
            } else if (command === "history") {
                var storedHistory = loadObject("RoomAccessModule_" + self.id);

                return {
                    'code': 1,
                    'message': 'OK',
                    'history': storedHistory
                }
            }
        },
        moduleId: this.id
    });

    // load or create person counter devices for the referenced rooms
    var personCounterDeviceIdOne = self.createPersonCounterIfNecessary(self.config.commonOptions.roomOne);
    var personCounterDeviceIdTwo = self.createPersonCounterIfNecessary(self.config.commonOptions.roomTwo);

    this.config.roomAccessControlsContainer.roomAccessControls.forEach(function(roomAccessControl) {
        if (roomAccessControl.roomAccessControlType === "Motion") {
            var motionSensorOne = roomAccessControl.roomAccessControlMotionSensor.motionSensorOne; // id of virtual device
            var motionSensorTwo = roomAccessControl.roomAccessControlMotionSensor.motionSensorTwo; // id of virtual device

            // add listener (id of virtual device is needed)
            self.controller.devices.on(motionSensorOne, 'change:metrics:level', function() {
                // important: load device by id only within the callback function (otherwise the object is null)
                var vDevMotionSensorOne = self.controller.devices.get(motionSensorOne); // virtual device object
                // get actual level (virtual device object is needed)
                var level = vDevMotionSensorOne.get("metrics:level");

                if(level == 'on') {
                    self.lastEventMotionSensorOne = new Date().getTime();
                    //self.controller.addNotification("info", "RoomAccessModule (" + self.id + "): Motion Sensor One (" + motionSensorOne + ") for room (" + self.config.room + ") fired", "module", "RoomAccessModule");
                    if(new Date().getTime() - self.lastEventMotionSensorTwo < self.motionSensorTime) {
                        self.performTransition(personCounterDeviceIdTwo, personCounterDeviceIdOne);
                    }
                }
            });

            // add listener (id of virtual device is needed)
            self.controller.devices.on(motionSensorTwo, 'change:metrics:level', function() {
                var vDevMotionSensorTwo = self.controller.devices.get(motionSensorTwo); // virtual device object
                // get actual level (virtual device object is needed)
                var level = vDevMotionSensorTwo.get("metrics:level");

                if(level == 'on') {
                    self.lastEventMotionSensorTwo = new Date().getTime();

                    if(new Date().getTime() - self.lastEventMotionSensorOne < self.motionSensorTime) {
                        self.performTransition(personCounterDeviceIdOne, personCounterDeviceIdTwo);
                    }
                }
            });
        } else if (roomAccessControl.roomAccessControlType === "Ultrasonic") {
            var ultrasonicSensor = roomAccessControl.roomAccessControlUltrasonicSensor.ultrasonicSensor;
            var ultrasonicSensorDoorHeight = roomAccessControl.roomAccessControlUltrasonicSensor.ultrasonicSensorDoorHeight;

            self.ultrasonicDoorHeight = ultrasonicSensorDoorHeight;

            // add listener (id of virtual device is needed)
            self.controller.devices.on(ultrasonicSensor, 'change:metrics:level', function() {
                var vDevUltrasonicSensor = self.controller.devices.get(ultrasonicSensor); // virtual device object
                // get actual level (virtual device object is needed)
                var level = vDevUltrasonicSensor.get("metrics:level");

                self.ultrasonicValueBuffer.push(level);

                self.addHistoryEntry("Ultrasonic", self.getUltrasonicValueBufferData());

                // TODO trigger person identification ...
            });
        }
    });

    // save the room id in metrics:roomId field of virtual device
    vDev.set("metrics:roomIdOne", self.config.commonOptions.roomOne);
    vDev.set("metrics:roomIdTwo", self.config.commonOptions.roomTwo);
};

RoomAccessModule.prototype.stop = function () {
    var self = this;

    self.config.roomAccessControlsContainer.roomAccessControls.forEach(function(roomAccessControl) {
        if (roomAccessControl.roomAccessControlType === "Motion") {
            self.controller.devices.off(roomAccessControl.roomAccessControlMotionSensor.motionSensorOne, 'change:metrics:level', function() {});
            self.controller.devices.off(roomAccessControl.roomAccessControlMotionSensor.motionSensorTwo, 'change:metrics:level', function() {});
        }
    });

    self.controller.devices.remove("RoomAccessModule_" + self.id);

    RoomAccessModule.super_.prototype.stop.call(self);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
RoomAccessModule.prototype.performTransition = function (personCounterDeviceIdLeft, personCounterDeviceIdEntered) {
    var self = this;

    // load person counter of the referenced rooms
    var personCounterDeviceOne = self.controller.devices.get("PersonCounterModule_" + personCounterDeviceIdLeft);
    var personCounterDeviceTwo = self.controller.devices.get("PersonCounterModule_" + personCounterDeviceIdEntered);

    // perform commands on referenced person counter
    personCounterDeviceIdLeft.performCommand("person_left");
    personCounterDeviceIdEntered.performCommand("person_entered");

    // emit event from room access module (RoomAccessModule_X:RoomAccessModule_Y_Z_transition_detected)
    self.controller.devices.emit('RoomAccessModule_' + this.id + ':RoomAccessModule_' + personCounterDeviceIdLeft.get("metrics:room") + '_' + personCounterDeviceIdEntered.get("metrics:room") + '_transition_detected');
};

RoomAccessModule.prototype.getUltrasonicValueBufferData = function () {
    var self = this;

    var sum = 0;
    self.ultrasonicValueBuffer.forEach(function(a) {
        sum += a;
    });
    var avg = sum / self.ultrasonicValueBuffer.size;

    // calculation without standby values (door height +/-)
    var sumClean = 0;
    var countClean = 0;
    self.ultrasonicValueBuffer.forEach(function(a) {
        if((self.ultrasonicDoorHeight - a) > self.ultrasonicAdjustment) {
            sumClean += a;
            countClean++;
        }
    });
    var avgClean = sumClean / countClean;

    return {
        'buffer': self.ultrasonicValueBuffer.toArray(),
        'sum': parseFloat(sum),
        'avg': parseFloat(avg.toFixed(2)),
        'adjustment': self.ultrasonicAdjustment,
        'door': self.ultrasonicDoorHeight,
        'sumClean': parseFloat(sumClean),
        'avgClean': parseFloat(avgClean.toFixed(2))
    }
};

RoomAccessModule.prototype.createPersonCounterIfNecessary = function (roomId) {
    var self = this;
    var deviceId = null;

    // check all existing PersonCounterDevices ...
    var existPersonCounterInRoom = false;
    self.controller.instances.forEach(function(instance) {
        if(instance.moduleId == 'PersonCounterModule') {
            if(instance.params.room == roomId) {
                existPersonCounterInRoom = true;
                deviceId = instance.id;
            }
        }
    });
    if(!existPersonCounterInRoom) {
        // create a new module (instance)
        var result = self.controller.createInstance({
            "instanceId": "0",
            "moduleId": "PersonCounterModule",
            "active": "true",
            "title": "Person Counter Module",
            "description": "This module counts person",
            "params": {
                "room": roomId // pass the roomId to the new PersonCounterModule
            }
        });

        self.controller.addNotification("info", "Created PersonCounterModule with Id " + result.id + " for room with id: " + roomId, "module", "PersonCounterModule");
        deviceId = result.id;
    }

    return deviceId;
};

RoomAccessModule.prototype.addHistoryEntry = function (roomAccessControl, historyEntry) {
    var self = this;
    var vDev = self.controller.devices.get("RoomAccessModule_" + self.id);

    var storedHistory = loadObject("RoomAccessModule_" + self.id);
    if (!storedHistory) {
        storedHistory = {
            deviceId: "RoomAccessModule_" + self.id,
            deviceName: vDev.get("metrics:title"),
            historyData: []
        };
    }
    storedHistory.historyData.push({
        "timeUnix": Date.now(),
        "timeFormat": new XDate(Date.now()).toString("dd.MM.yyyy hh:mm:ss"),
        "roomAccessControl": roomAccessControl,
        "data": historyEntry
    });
    saveObject("RoomAccessModule_" + self.id, storedHistory);
    storedHistory = null;
}
