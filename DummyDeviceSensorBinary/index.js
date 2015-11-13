/* Dummy Device Sensor Binary module
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DummyDeviceSensorBinary (id, controller) {
    // Call superconstructor first (AutomationModule)
    DummyDeviceSensorBinary.super_.call(this, id, controller);
}

inherits(DummyDeviceSensorBinary, AutomationModule);

_module = DummyDeviceSensorBinary;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

DummyDeviceSensorBinary.prototype.init = function (config) {
    DummyDeviceSensorBinary.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "DummyDeviceSensorBinary_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'Dummy Device Sensor Binary ' + this.id,
                level: ''
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'sensorBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorBinary", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/DummyDeviceSensorBinary/icon.png"
			}
        },
        handler: function (command, args) { // processing of incoming commands over ZAutomation API
            // try it: http://localhost:8083/ZAutomation/api/v1/devices/DummyDeviceSensorBinary_23/command/on
            // ! pay attention to your actual virtual device id 'DummyDeviceSensorBinary_23'
            if(command === "on" || command === 'off') {
                // change level of virtual device, will change the output of ui element ...
                vDev.set("metrics:level", command);

                // see event view of smart home ui ...
                self.controller.addNotification("info", "Dummy Device Sensor Binary (" + self.id + ") - New level is " + command + ".", "module", "DummyDeviceSensorBinary");

                // send a response: all OK ...
                return {
                    'code': 1,
                    'message': 'OK'
                }
			}
        },
        moduleId: this.id
    });
};

DummyDeviceSensorBinary.prototype.stop = function () {
    this.controller.devices.remove("DummyDeviceSensorBinary_" + this.id);

    DummyDeviceSensorBinary.super_.prototype.stop.call(this);
};
