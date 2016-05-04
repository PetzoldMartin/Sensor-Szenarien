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

    // time for checking for a transition with the second sensor in milliseconds
    self.motionSensorTime = 5000;

    self.lastEventMotionSensorOne;
    self.lastEventMotionSensorTwo;

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
        }
    });

    // save the room id in metrics:roomId field of virtual device
    vDev.set("metrics:roomIdOne", this.config.commonOptions.roomOne);
    vDev.set("metrics:roomIdTwo", this.config.commonOptions.roomTwo);
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
