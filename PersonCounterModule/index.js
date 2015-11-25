/*** PersonCounterModule ***

Version: 1.1.0
-----------------------------------------------------------------------------
Author: Philip Laube <phl111fg@fh-zwickau.de>, Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
Description:
    Creates a person counter device
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

	// Virtuel Device Definition
	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "PersonCounterModule_" + this.id,			// Identifier for ZAutomation API
        defaults: {
            metrics: {
                title: 'PersonCounterModule ' + this.id,
				persons: 0,							         // !
                roomId: -1
            }
        },
        overlay: {
            deviceType: "sensorMultilevel",					// this deviceType enables the module as condition for logical rules
            metrics: {
				scaleTitle: "Persons",

				// this is the icon for the elements view
				// icon is located in the modules 'htdocs' folder
				// 'PersonCounterModule' from the link below is the module class name
				icon: "/ZAutomation/api/v1/load/modulemedia/PersonCounterModule/icon.png"
			}
        },
        handler: function (command, args) {					// Processing of incoming commands over ZAutomation API
            var persons = vDev.get("metrics:persons");
            var room = vDev.get("metrics:roomId");
			switch(command){
            case "person_entered" :
                vDev.set("metrics:persons", persons + 1);
                // for debugging and testing
                self.controller.addNotification("info", "Person entered room "+ room +" (new value: " + vDev.get("metrics:persons") + " persons)", "module", "PersonCounterModule");
                self.controller.devices.emit('PersonCounterModule_' + vDev.deviceId + '_person_entered');
                break;
			case "person_left":
                if (persons > 0){
                    vDev.set("metrics:persons", persons - 1);
                    // for debugging and testing
                    self.controller.addNotification("info", "Person left room "+ room +" (new value: " + vDev.get("metrics:persons") + " persons)", "module", "PersonCounterModule");
                    self.controller.devices.emit('PersonCounterModule_' + vDev.deviceId + '_person_left');
                }
                break;
			case "persons":
                return vDev.metrics.persons;
            break;
            }
        },
        moduleId: this.id
    });

    // save the room id in metrics:roomId field of virtual device
    vDev.set("metrics:roomId", this.config.room);
};

PersonCounterModule.prototype.stop = function () {
    this.controller.devices.remove("PersonCounterModule_" + this.id);

    PersonCounterModule.super_.prototype.stop.call(this);
};


// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------