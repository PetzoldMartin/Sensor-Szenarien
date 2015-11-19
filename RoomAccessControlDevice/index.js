/*** RoomAccessControlDevice module ***

Version: 1.0.0
-----------------------------------------------------------------------------
Author: Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
Description:
    Creates a room access control device
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RoomAccessControlDevice (id, controller) {
    // Call superconstructor first (AutomationModule)
    RoomAccessControlDevice.super_.call(this, id, controller);
}

inherits(RoomAccessControlDevice, AutomationModule);

_module = RoomAccessControlDevice;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

RoomAccessControlDevice.prototype.init = function (config) {
    RoomAccessControlDevice.super_.prototype.init.call(this, config);

    var self = this;

    this.lastEventMotionSensorIn = null;
    this.lastEventMotionSensorOut = null;

	// Virtuel Device Definition
	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "RoomAccessControlDevice_" + this.id,			// Identifier for ZAutomation API
        defaults: {
            metrics: {
                title: 'RoomAccessControlDevice ' + this.id,
                roomId: -1
            }
        },
        overlay: {
            deviceType: "roomAccessControlDevice",
            metrics: {
				// this is the icon for the elements view
				// icon is located in the modules 'htdocs' folder
				// 'PersonCounterDevice' from the link below is the module class name
				icon: "/ZAutomation/api/v1/load/modulemedia/RoomAccessControlDevice/icon.png"
			}
        },
        moduleId: this.id
    });

    this.config.roomAccessControls.forEach(function(roomAccessControl) {
        if (roomAccessControl.roomAccessControlType === "Motion") {
            var motionSensorIn = roomAccessControl.roomAccessControlMotionSensor.motionSensorIn; // id of virtual device
            var motionSensorOut = roomAccessControl.roomAccessControlMotionSensor.motionSensorOut; // id of virtual device

            // add listener (id of virtual device is needed)
            self.controller.devices.on(motionSensorIn, 'change:metrics:level', function() {
                // important: load device by id only within the callback function (otherwise the object is null)
                var vDevMotionSensorIn = self.controller.devices.get(motionSensorIn); // virtual device object
                // get actual level (virtual device object is needed)
                var level = vDevMotionSensorIn.get("metrics:level");

                if(level == 'on') {
                    self.lastEventMotionSensorIn = new Date().getTime();
                    self.controller.addNotification("info", "RoomAccessControlDevice (" + self.id + "): Motion Sensor One (" + motionSensorIn + ") for room (" + self.config.room + ") fired", "module", "RoomAccessControlDevice");

                    if(new Date().getTime() - self.lastEventMotionSensorOut < 10000) {
                        self.controller.devices.emit(vDev.deviceId + ':personEnterRoom');
                    }
                }
            });

            // add listener (id of virtual device is needed)
            self.controller.devices.on(motionSensorOut, 'change:metrics:level', function() {
                var vDevMotionSensorOut = self.controller.devices.get(motionSensorOut); // virtual device object
                // get actual level (virtual device object is needed)
                var level = vDevMotionSensorOut.get("metrics:level");

                if(level == 'on') {
                    self.lastEventMotionSensorOut = new Date().getTime();
                    self.controller.addNotification("info", "RoomAccessControlDevice (" + self.id + "): Motion Sensor Two (" + motionSensorOut + ") for room (" + self.config.room + ") fired", "module", "RoomAccessControlDevice");

                    if(new Date().getTime() - self.lastEventMotionSensorIn < 10000) {
                        self.controller.devices.emit(vDev.deviceId + ':personLeaveRoom');
                    }
                }
            });
        } else if (roomAccessControl.roomAccessControlType === "CO2") {

        } else if (roomAccessControl.roomAccessControlType === "Beacon") {

        }
    });

    // save the room id in metrics:roomId field of virtual device
    vDev.set("metrics:roomId", this.config.room);
};

RoomAccessControlDevice.prototype.stop = function () {
    var self = this;

    this.config.roomAccessControls.forEach(function(roomAccessControl) {
        if (roomAccessControl.roomAccessControlType === "Motion") {
            self.controller.devices.off(roomAccessControl.roomAccessControlMotionSensor.motionSensorIn, 'change:metrics:level', function() {});
            self.controller.devices.off(roomAccessControl.roomAccessControlMotionSensor.motionSensorOut, 'change:metrics:level', function() {});
        } else if (roomAccessControl.roomAccessControlType === "CO2") {

        } else if (roomAccessControl.roomAccessControlType === "Beacon") {

        }
    });

    this.controller.devices.remove("RoomAccessControlDevice_" + this.id);

    RoomAccessControlDevice.super_.prototype.stop.call(this);
};


// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
