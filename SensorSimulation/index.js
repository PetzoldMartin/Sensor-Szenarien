/* Sensor Simulation module
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SensorSimulation (id, controller) {
    // Call superconstructor first (AutomationModule)
    SensorSimulation.super_.call(this, id, controller);
}

inherits(SensorSimulation, AutomationModule);

_module = SensorSimulation;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

SensorSimulation.prototype.init = function (config) {
    SensorSimulation.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "SensorSimulation_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'Sensor Simulation ' + this.id,
                level: ''
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/SensorSimulation/icon.png"
			}
        },
        handler: function (command, args) { // processing of incoming commands over ZAutomation API
            // try it: http://localhost:8083/ZAutomation/api/v1/devices/SensorSimulation_23/command/increase?period=5&delta=5
            // ! pay attention to your actual virtual device id 'DummyDeviceSensorMultilevel_23'
            if(command === "increase" || command === "decrease") {

                // first clear existing timer
                if(self.timer) {
                    clearInterval(self.timer);
                }

                if(args.period && args.delta) {
                    // change level of virtual device, will change the output of ui element ...
                    var period = parseFloat(args.period);
                    var delta = parseFloat(args.delta);
                    if(!isNaN(period) || !isNaN(delta)) {
                        vDev.set("metrics:level", "Active");

                        self.step = 0;

                        self.timer = setInterval(function() {
                            self.step++;
                            vDev.set("metrics:level", "Active " + self.step);

                            self.config.dummyDevices.forEach(function(el) {
                                var vDev = self.controller.devices.get(el);

                                if (vDev) {
                                    var actLevel = vDev.get("metrics:level");

                                    if(command == "decrease") {
                                        vDev.performCommand("exact", { level: actLevel - delta });
                                    } else {
                                        vDev.performCommand("exact", { level: actLevel + delta });
                                    }
                                }
                            });
                        }, period * 1000);

                        // send a response: all OK ...
                        return {
                            'code': 1,
                            'message': 'OK'
                        }
                    } else {
                        // send a response: wrong parameter ...
                        return {
                            'code': 2,
                            'message': 'Error - parameter period and delta are not numbers'
                        }
                    }
                } else {
                    return {
                        'code': 3,
                        'message': 'Error - missing parameter'
                    }
                }
			} else if(command === "stop") {
                vDev.set("metrics:level", "Pause");

                if(self.timer) {
                    clearInterval(self.timer);
                }
            } else {
                return {
                    'code': 4,
                    'message': 'Error - command not allowed'
                }
            }
        },
        moduleId: this.id
    });

    vDev.set("metrics:level", "Initialized");
};

SensorSimulation.prototype.stop = function () {
    var self = this;

    if(self.timer) {
        clearInterval(self.timer);
    }

    this.controller.devices.remove("SensorSimulation_" + this.id);

    SensorSimulation.super_.prototype.stop.call(this);
};
