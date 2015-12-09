/*** PersonCounterModule ***

Version: 1.1.3
-----------------------------------------------------------------------------
Author: Philip Laube <phl111fg@fh-zwickau.de>, Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
Description:
    Creates a person counter device. Should be created per room to keep track of the persons in a speicific room.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function PersonCounterModule (id, controller) {
    // Call superconstructor first (AutomationModule)
    PersonCounterModule.super_.call(this, id, controller);
}

inherits(PersonCounterModule, AutomationModule);

_module = PersonCounterModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

PersonCounterModule.prototype.init = function (config) {
    PersonCounterModule.super_.prototype.init.call(this, config);

    var self = this;

	// Virtual Device Definition
	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "PersonCounterModule_" + this.id,			// Identifier for ZAutomation API
        defaults: {
            metrics: {
                title: 'PersonCounterModule ' + this.id,
                room: -1,
                level: 0
            }
        },
        overlay: {
            deviceType: "sensorMultilevel",					// this deviceType enables the module as condition for logical rules
            metrics: {
				scaleTitle: "Persons",
				icon: "/ZAutomation/api/v1/load/modulemedia/PersonCounterModule/icon.png"
			}
        },
        handler: function (command, args) {					// Processing of incoming commands over ZAutomation API
            var persons = vDev.get("metrics:level");
            var room = vDev.get("metrics:room");
            var eventID = vDev.deviceId + ':PersonCounterModule_' + room + '_person_';
			switch(command){
            case "person_entered" :
                vDev.set('metrics:level', persons + 1);
                // for debugging and testing
                self.controller.addNotification("info", "Person entered room "+ room +" (new value: " + persons + 1 + " persons)", "module", "PersonCounterModule");
                self.controller.devices.emit(eventID + 'entered');
                break;
			case "person_left":
                if (persons > 0){
                    vDev.set('metrics:level', persons - 1);
                    // for debugging and testing
                    self.controller.addNotification("info", "Person left room "+ room +" (new value: " + persons - 1 + " persons)", "module", "PersonCounterModule");
                    self.controller.devices.emit(eventID + 'left');
                }
                break;
			case "persons":
                return vDev.get("metrics:level");
            break;
            }
        },
        moduleId: this.id
    });
};

PersonCounterModule.prototype.stop = function () {
    this.controller.devices.remove("PersonCounterModule_" + this.id);

    PersonCounterModule.super_.prototype.stop.call(this);
};