/* In Home Feedback Module
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Patrick Hecker <pah111kg@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InHomeFeedbackModule (id, controller) {
    // Call superconstructor first (AutomationModule)
    InHomeFeedbackModule.super_.call(this, id, controller);
}

inherits(InHomeFeedbackModule, AutomationModule);

_module = InHomeFeedbackModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

InHomeFeedbackModule.prototype.init = function (config) {
    InHomeFeedbackModule.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "InHomeFeedbackModule_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'In Home Feedback Module ' + this.id,
                roomId: -1
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'switchBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/InHomeFeedbackModule/icon.png"
			}
        },
        handler: function (command, args) { // processing of incoming commands over ZAutomation API
            // try it: http://localhost:8083/ZAutomation/api/v1/devices/InHomeFeedbackModule_42/command/c1?p1=42
            // ! pay attention to your actual virtual device id 'InHomeFeedbackModule_42'
            if(command === "start") {
                var duration = self.config.duration;
                if(args.duration) {
                    duration = args.duration;
                }

                // start feedback mechanism
                self.startVisualActuatorsMechanism();
                self.controller.addNotification("info", "InHomeFeedbackModule start feedback mechanism for the next " + duration + " seconds.", "module", "InHomeFeedbackModule");

                // start automatic termination timeout
                this.timeout = setTimeout(function() {
                    // cancel feedback mechanism
                    self.stopVisualActuatorsMechanism();

                    self.controller.addNotification("info", "InHomeFeedbackModule stopped feedback mechanism", "module", "InHomeFeedbackModule");
                }, duration * 1000);
			} else if(command === "stop") {
                if (this.timeout) {
                    // remove automatic termination timeout
                    clearTimeout(this.timeout);

                    // cancel feedback mechanism
                    self.stopVisualActuatorsMechanism();

                    self.controller.addNotification("info", "InHomeFeedbackModule stopped feedback mechanism", "module", "InHomeFeedbackModule");
                }
            }
        },
        moduleId: this.id
    });

    // save the room id in metrics:roomId field of virtual device
    if(self.config.room) {
        vDev.set("metrics:roomId", self.config.room);
    }
};

InHomeFeedbackModule.prototype.stop = function () {
    var self = this;

    self.stopVisualActuatorsMechanism();

    self.controller.devices.remove("InHomeFeedbackModule_" + self.id);

    InHomeFeedbackModule.super_.prototype.stop.call(self);
};

InHomeFeedbackModule.prototype.startVisualActuatorsMechanism = function () {
    var self = this;
    var visualActuatorsActive = false;

    // check if any visual actuators are configured
    if (self.config.visualActuators) {
        // run endless loop (on-off-on-off-on-...)
        self.visualActuatorsTimer = setInterval(function() {
            if (visualActuatorsActive) {
                self.config.visualActuators.forEach(function(el) {
                    var vDev = self.controller.devices.get(el);

                    if (vDev) {
                        var deviceType = vDev.get("deviceType");

                        if (deviceType === "switchBinary") {
                            vDev.set("metrics:level", 'off');
                        } else if (deviceType === "switchMultilevel") {
                            vDev.set("metrics:level", '0');
                        }
                    }
                });
                visualActuatorsActive = false;
            } else {
                self.config.visualActuators.forEach(function(el) {
                    var vDev = self.controller.devices.get(el);

                    if (vDev) {
                        var deviceType = vDev.get("deviceType");

                        if (deviceType === "switchBinary") {
                            vDev.set("metrics:level", 'on');
                        } else if (deviceType === "switchMultilevel") {
                            vDev.set("metrics:level", '99');
                        }
                    }
                });
                visualActuatorsActive = true;
            }
        }, 2 * 1000);
    }
};

InHomeFeedbackModule.prototype.stopVisualActuatorsMechanism = function () {
    var self = this;

    if (self.visualActuatorsTimer) {
        clearInterval(self.visualActuatorsTimer);
    }
};
