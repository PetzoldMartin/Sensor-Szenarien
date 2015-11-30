/* Module to set smart home in standby mode
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Simon Schwabe <sis111su@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function StandbyModule (id, controller) {
    // Call superconstructor first (AutomationModule)
    StandbyModule.super_.call(this, id, controller);
}

inherits(StandbyModule, AutomationModule);

_module = StandbyModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

StandbyModule.prototype.init = function (config) {
    StandbyModule.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "StandbyModule_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'StandbyModule ' + this.id,
                level: 'current state'
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'switchBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/StandbyModule/icon.png"
			}
        },
        moduleId: this.id
    });

    self.controller.devices.on('LockDoorModule_locked', function() {
        // set configured devices in defined standby state

        vDev.set("metrics:level", "put devices to standby");
    });

    self.controller.devices.on('LockDoorModule_unlocked', function() {
        vDev.set("metrics:level", "finished standby");
    });
};

StandbyModule.prototype.stop = function () {
    this.controller.devices.remove("StandbyModule_" + this.id);

    this.controller.devices.off('LockDoorModule_locked', function(){});
    this.controller.devices.off('LockDoorModule_unlocked', function(){});

    StandbyModule.super_.prototype.stop.call(this);
};
