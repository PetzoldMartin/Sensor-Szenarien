/* Module to set smart home in standby mode
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Simon Schwabe <sis111su@fh-zwickau.de>, Zarina Omurova<Zarina.Muratbekovna.Omurova.207@fh-zwickau.de>
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
	  
 // save the room id in metrics:roomId field of virtual device

	 if(self.config.room) {
        vDev.set("metrics:roomId", self.config.room);
    }
    self.controller.devices.on('LockDoorModule_locked', function() {
        // set configured devices in defined standby state
		var room = vDev.get("metrics:room");
		
		self.config.switchesStartStandby.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    vDev.performCommand(devState.status);
                }
            });
		self.config.dimmersStartStandby.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    vDev.performCommand("exact", { level: devState.status });
                }
            });
			
		vDev.set("metrics:level", "put devices to standby");
		self.controller.devices.emit(vDev.deviceId + ':StandbyModule_' + room + '_started');
		self.controller.addNotification("info", "Standby started, set devices to defined state", "module", "StandbyModule");
	 });

    self.controller.devices.on('LockDoorModule_unlocked', function() {
		var room = vDev.get("metrics:room");
		vDev.set("metrics:level", "finished standby");
		self.config.switchesFinishedStandby.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    vDev.performCommand(devState.status);
                }
            });
		self.config.dimmersFinishedStandby.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    vDev.performCommand("exact", { level: devState.status });
                }
            });
	
		
		self.controller.devices.emit(vDev.deviceId + ':StandbyModule_' + room + '_stopped');
		self.controller.addNotification("info", "Standby stopped, devices were set to state", "module", "StandbyModule");
    });
};

StandbyModule.prototype.stop = function () {
    this.controller.devices.remove("StandbyModule_" + this.id);

    this.controller.devices.off('LockDoorModule_locked', function(){});
    this.controller.devices.off('LockDoorModule_unlocked', function(){});

    StandbyModule.super_.prototype.stop.call(this);
};