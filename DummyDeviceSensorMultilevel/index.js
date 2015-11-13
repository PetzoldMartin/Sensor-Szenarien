/* Dummy Device Sensor Multilevel module
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DummyDeviceSensorMultilevel (id, controller) {
    // Call superconstructor first (AutomationModule)
    DummyDeviceSensorMultilevel.super_.call(this, id, controller);
}

inherits(DummyDeviceSensorMultilevel, AutomationModule);

_module = DummyDeviceSensorMultilevel;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

DummyDeviceSensorMultilevel.prototype.init = function (config) {
    DummyDeviceSensorMultilevel.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "DummyDeviceSensorMultilevel_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'Dummy Device Sensor Multilevel ' + this.id,
                level: ''
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/DummyDeviceSensorMultilevel/icon.png"
			}
        },
        handler: function (command, args) { // processing of incoming commands over ZAutomation API
            // try it: http://localhost:8083/ZAutomation/api/v1/devices/DummyDeviceSensorMultilevel_23/command/exact?level=42
            // ! pay attention to your actual virtual device id 'DummyDeviceSensorMultilevel_23'
            if(command === "exact") {
                if(args.level) {
                    // change level of virtual device, will change the output of ui element ...
                    var newLevel = parseFloat(args.level);
                    if(!isNaN(newLevel)) {
                        vDev.set("metrics:level", newLevel);

                        // see event view of smart home ui ...
                        self.controller.addNotification("info", "Dummy Device Sensor Multilevel (" + self.id + ") - New level is " + newLevel + ".", "module", "DummyDeviceSensorMultilevel");

                        // send a response: all OK ...
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
                        'message': 'Error - missing parameter'
                    }
                }
			}
        },
        moduleId: this.id
    });
};

DummyDeviceSensorMultilevel.prototype.stop = function () {
    this.controller.devices.remove("DummyDeviceSensorMultilevel_" + this.id);

    DummyDeviceSensorMultilevel.super_.prototype.stop.call(this);
};
