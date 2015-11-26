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
                // self.controller.devices.emit(vDev.deviceId + ':door_lock_module_unlocked');
                self.controller.devices.emit("door_lock_module_unlocked");
            } else if (switchVDev.get("metrics:level") == "on") {
                // standby mode should be started
                vDev.set("metrics:level", "time to enter standby");

                self.peoplePresent = false;
                // check all PersonCounter
                // self.controller.devices.forEach(function(vDev) {
                //     if (vDev.id.indexOf("DummyDevice_35") != -1 ) {
                //         var persons = vDev.get("metrics:level");
                //         // var persons = vDev.performCommand('persons');
                //         if (persons > 0) {
                //             peoplePresent = true;
                //         }
                //     }
                // });
                self.controller.devices.forEach(function(vDev){
                    self.checkPersonCountersAndStartFeedback(vDev);
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
                self.controller.devices.emit("door_lock_module_locked");
            }

            // console.log("LockDoorModule DEVID: " + vDev.deviceId);
        });
    }
};

LockDoorModule.prototype.stop = function () {
    this.controller.devices.remove("LockDoorModule_" + this.id);

    LockDoorModule.super_.prototype.stop.call(this);
};

LockDoorModule.prototype.checkPersonCountersAndStartFeedback = function (vDev) {
    if (vDev.id.indexOf("DummyDevice_35") != -1 ) {
        // console.log("LOCATION: " + vDev.get("location"));

        var persons = vDev.get("metrics:level");
        // var persons = vDev.performCommand('persons');
        if (persons > 0) {
            this.peoplePresent = true;
        } else {
            this.controller.devices.forEach(function(el) {
                console.log("ROOMID: " + el.get("metrics:roomId"));
                console.log("ROOMID: " + vDev.get("location"));
                // if ((el.id.indexOf('InHomeFeedbackModule') != -1) && el.get("metrics:roomId") == vDev.get("location") ) {
                if ((el.id.indexOf('InHomeFeedbackModule') != -1) && el.get("metrics:roomId") == - 1)  {
                    console.log("START FEEDBACK");
                }
            });
        }
    }
};
