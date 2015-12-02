/*** RoomAccessModule module ***

Version: 1.1.0
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

    this.lastEventMotionSensorOne = null;
    this.lastEventMotionSensorTwo = null;

    // Virtuel Device Definition
    // This object defines the interface for the ZAutomation API and the UI (Elements)
    var vDev = self.controller.devices.create({
        deviceId: "RoomAccessModule_" + this.id,            // Identifier for ZAutomation API
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
                // this is the icon for the elements view
                // icon is located in the modules 'htdocs' folder
                // 'PersonCounterDevice' from the link below is the module class name
                icon: "/ZAutomation/api/v1/load/modulemedia/RoomAccessModule/icon.png"
            }
        },
        moduleId: this.id
    });
    
    // setup and connect a PersonCounterDevice for this room
    // save the id of PersonCounterDevice as instance variable, because
    // the access in the stop function is necessary
    self.personCounterDeviceIdOne = self.createPersonCounterIfNecessary(self.config.roomOne);
    
        /*if(!personCounterDeviceOne) {
        self.controller.addNotification("error", "RoomAccessModule (" + self.id + "): PersonCounterDevice (" + personCounterDeviceIdOne + ") for room (" + self.config.room + ") not found", "module", "RoomAccessModule");
        stop();
        }*/
    
    self.personCounterDeviceIdTwo = self.createPersonCounterIfNecessary(self.config.roomTwo);
    
        /*if(!personCounterDeviceTwo) {
        self.controller.addNotification("error", "RoomAccessModule (" + self.id + "): PersonCounterDevice (" + personCounterDeviceIdTwo + ") for room (" + self.config.room + ") not found", "module", "RoomAccessModule");
        stop();
        }*/

    this.config.roomAccessControls.forEach(function(roomAccessControl) {
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
                    if(new Date().getTime() - self.lastEventMotionSensorTwo < 5000) {
    var personCounterDeviceOne = self.controller.devices.get("PersonCounterModule_" + self.personCounterDeviceIdOne);
    var personCounterDeviceTwo = self.controller.devices.get("PersonCounterModule_" + self.personCounterDeviceIdTwo);
                            var numberOfPersonsRoomOne = personCounterDeviceOne.get("metrics:level");
                            numberOfPersonsRoomOne++;
                            personCounterDeviceOne.set("metrics:level", numberOfPersonsRoomOne);
                            var numberOfPersonsRoomTwo = personCounterDeviceTwo.get("metrics:level");
                            numberOfPersonsRoomTwo--;
                            personCounterDeviceTwo.set("metrics:level", numberOfPersonsRoomTwo);
                        //self.controller.devices.emit(vDev.deviceId + ':RoomAccessModule' + vDev.get("metrics:roomIdTwo") +'_'+ vDev.get("metrics:roomIdOne") + '_transition_detected');
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
                    //self.controller.addNotification("info", "RoomAccessModule (" + self.id + "): Motion Sensor Two (" + motionSensorTwo + ") for room (" + self.config.room + ") fired", "module", "RoomAccessModule");

                    if(new Date().getTime() - self.lastEventMotionSensorOne < 5000) {
    var personCounterDeviceOne = self.controller.devices.get("PersonCounterModule_" + self.personCounterDeviceIdOne);
    var personCounterDeviceTwo = self.controller.devices.get("PersonCounterModule_" + self.personCounterDeviceIdTwo);
                            var numberOfPersonsRoomOne = personCounterDeviceOne.get("metrics:level");
                            numberOfPersonsRoomOne--;
                            personCounterDeviceOne.set("metrics:level", numberOfPersonsRoomOne);
                            var numberOfPersonsRoomTwo = personCounterDeviceTwo.get("metrics:level");
                            numberOfPersonsRoomTwo++;
                            personCounterDeviceTwo.set("metrics:level", numberOfPersonsRoomTwo);
                        //self.controller.devices.emit(vDev.deviceId + ':RoomAccessModule' + vDev.get("metrics:roomIdOne") +'_'+ vDev.get("metrics:roomIdTwo") + '_transition_detected');
                    }
                }
            });
        } else if (roomAccessControl.roomAccessControlType === "CO2") {

        } else if (roomAccessControl.roomAccessControlType === "Beacon") {

        }
    });

    // save the room id in metrics:roomId field of virtual device
    vDev.set("metrics:roomIdOne", this.config.roomOne);
    vDev.set("metrics:roomIdTwo", this.config.roomTwo);
};

RoomAccessModule.prototype.stop = function () {
    var self = this;

    this.config.roomAccessControls.forEach(function(roomAccessControl) {
        if (roomAccessControl.roomAccessControlType === "Motion") {
            self.controller.devices.off(roomAccessControl.roomAccessControlMotionSensor.motionSensorOne, 'change:metrics:level', function() {});
            self.controller.devices.off(roomAccessControl.roomAccessControlMotionSensor.motionSensorTwo, 'change:metrics:level', function() {});
        } else if (roomAccessControl.roomAccessControlType === "CO2") {

        } else if (roomAccessControl.roomAccessControlType === "Beacon") {

        }
    });

    this.controller.devices.remove("RoomAccessModule_" + this.id);

    RoomAccessModule.super_.prototype.stop.call(this);
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

        self.controller.addNotification("info", "Created PersonCounterModule with Id " + result.id + " for room with Id: " + roomId, "module", "PersonCounterModule");
        deviceId = result.id;
    }

    return deviceId;
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
