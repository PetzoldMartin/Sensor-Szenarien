/* TurnOffTimerModule
 *
 * -----------------------------------------------------------------------------
 * 				2015
 * Author: 		Tobias Weise <Tobias.Weise.1em@fh-zwickau.de>
 * Description:	Implements a timer and sends an event after expiring
 * -----------------------------------------------------------------------------
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TurnOffTimerModule (id, controller) {
    // Call superconstructor first (AutomationModule)
    TurnOffTimerModule.super_.call(this, id, controller);
}

inherits(TurnOffTimerModule, AutomationModule);
_module = TurnOffTimerModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TurnOffTimerModule.prototype.init = function (config) {
    TurnOffTimerModule.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "TurnOffTimerModule_" + this.id,
        defaults: {
            metrics: {
                title: 'Turn Off Timer Module ' + this.id,
				level: '',
				roomId: -1,
				cancel: 0
            }
        },
        overlay: {
            deviceType: "sensorMultilevel",
			metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/TurnOffTimerModule/icon.png"
			}
        },
		handler: function (command, args) {
			
			if(feedbackModuleVDev == null) {
				vDev.set("metrics:level", "In Home Feedback Module is required");
			}

            if(command === "start_timer" && feedbackModuleVDev != null) {
                if(args.time) {
					var counter = 0;
					vDev.set("metrics:cancel", "0");
					feedbackModuleVDev.performCommand("start", {endless: true});

					var i = setInterval(function(){
						var currentCount = args.time - (counter + 1);
						var text = "Current timer time = " + currentCount + " seconds";
						vDev.set("metrics:level", text);
						counter++;

						if(counter == (args.time - 1)) {
							clearInterval(i);
							currentCount = 0;
							vDev.set("metrics:level", "Timer has expired");
							feedbackModuleVDev.performCommand("stop");
							self.controller.addNotification("info", "Turn Off Timer Module has expired for room " + room, "module", "TurnOffTimerModule");
							self.controller.devices.emit(vDev.deviceId + ':TurnOffTimerModule_' + room + '_expired');
						}
						else if(vDev.get("metrics:cancel") == 1) {
							clearInterval(i);
							currentCount = 0;
							vDev.set("metrics:level", "Timer has canceled");
							feedbackModuleVDev.performCommand("stop");
							self.controller.addNotification("info", "Turn Off Timer Module has canceled for room " + room, "module", "TurnOffTimerModule");
							self.controller.devices.emit(vDev.deviceId + ':TurnOffTimerModule_' + room + '_canceled');
						}
					}, 1000);
				}
			}
			else if(command === "stop") {
				vDev.set("metrics:cancel", "1");
			}
		},
        moduleId: this.id
    });
	
	var room 				 = vDev.get("metrics:roomId");
	var feedbackModuleVDevId = "InHomeFeedbackModule_" + self.findFeedbackModule(room);
	var feedbackModuleVDev   =  self.controller.devices.get(feedbackModuleVDevId);
	
	var eventName 			 = "InHomeFeedbackModule_" + room + "_canceled_by_user";
	
    self.controller.devices.on(feedbackModuleVDevId, eventName, function() {
		vDev.set("metrics:cancel", "1");
    });
	
    self.vDev = vDev;

	vDev.set("metrics:level", "Timer is ready");

    vDev.set("metrics:roomId", this.config.room);
};

TurnOffTimerModule.prototype.stop = function () {
	
	self = this;
	
    // event unsubscription
    var room 				 = self.vDev.get("metrics:roomId");
    var feedbackModuleVDevId = "InHomeFeedbackModule_" + self.findFeedbackModule(room);
    var eventName 			 = "InHomeFeedbackModule_" + room + "_canceled_by_user";

    self.controller.devices.off(feedbackModuleVDevId, eventName, function() {});

    this.controller.devices.remove("TurnOffTimerModule_" + this.id);

    TurnOffTimerModule.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

TurnOffTimerModule.prototype.findFeedbackModule = function (roomId) {
    self = this;
    var deviceId = null;

    self.controller.instances.forEach(function(instance) {

        if(instance.moduleId == 'InHomeFeedbackModule') {
            if(instance.params.commonOptions.room == roomId) {
                deviceId = instance.id;
            }
        }
    });

    return deviceId;
};
