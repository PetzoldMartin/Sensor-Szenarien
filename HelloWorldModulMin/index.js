/* HelloWorld module minimal
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function HelloWorldModulMin (id, controller) {
    // Call superconstructor first (AutomationModule)
    HelloWorldModulMin.super_.call(this, id, controller);
}

inherits(HelloWorldModulMin, AutomationModule);

_module = HelloWorldModulMin;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

HelloWorldModulMin.prototype.init = function (config) {
    HelloWorldModulMin.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "HelloWorldModulMin_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'Hello World Modul Minimal ' + this.id,
                level: 'Hello World Min ...'
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'switchBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/HelloWorldModulMin/icon.png"
			}
        },
        moduleId: this.id
    });
};

HelloWorldModulMin.prototype.stop = function () {
    this.controller.devices.remove("HelloWorldModulMin_" + this.id);

    HelloWorldModulMin.super_.prototype.stop.call(this);
};
