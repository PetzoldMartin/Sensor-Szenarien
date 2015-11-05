/* HelloWorld module tutorial
 *
 * Version: 1.0.0
 * 2015
 *
 * Author: Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function HelloWorldModulTutorial (id, controller) {
    // Call superconstructor first (AutomationModule)
    HelloWorldModulTutorial.super_.call(this, id, controller);
}

inherits(HelloWorldModulTutorial, AutomationModule);

_module = HelloWorldModulTutorial;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

HelloWorldModulTutorial.prototype.init = function (config) {
    HelloWorldModulTutorial.super_.prototype.init.call(this, config);

    var self = this;

    // *************************************
    // *** 7. Include JavaScript library ***
    // *************************************

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "HelloWorldModulTutorial_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'Hello World Modul Tutorial ' + this.id,
                // **************************
                // *** 6. Extend metrics ****
                // **************************
                level: '...'
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'switchBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/HelloWorldModulTutorial/icon.png"
			}
        },
        // **************************
        // *** 1. Command Handler ***
        // **************************
        moduleId: this.id
    });

    // ******************************
    // *** 3.1. Use configuration ***
    // ******************************

    // **************************************************
    // *** 5. Sign up for the emitted event of step 4 ***
    // **************************************************

    // ****************************
    // *** 6.1. Extend metrics ****
    // ****************************

    // *******************************************
    // *** 8. Define a timer for periodic task ***
    // *******************************************
};

HelloWorldModulTutorial.prototype.stop = function () {
    // *****************************************
    // *** 4.1. Use virtual device parameter ***
    // *****************************************

    // ***************************************************
    // *** 5.1 Sign up for the emitted event of step 4 ***
    // ***************************************************

    // *****************************************
    // *** 8.1 Finish timer in stop-Function ***
    // *****************************************

    this.controller.devices.remove("HelloWorldModulTutorial_" + this.id);

    HelloWorldModulTutorial.super_.prototype.stop.call(this);
};
