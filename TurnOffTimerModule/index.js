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
        deviceId: "TurnOffTimerModule_" + this.id,// identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'Turn Off Timer Module ' + this.id,
				level: '',
				roomId: -1,
				priority: -1,
				time: 0,
				currentCount: 0,
				cancel: 0
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'switchBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorMultilevel",
			metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/TurnOffTimerModule/icon.png"
			}
        },
		handler: function (command, args) {
			
			// check if InHomeFeedbackModule exists
			if(feedbackModuleVDev == null) {
				vDev.set("metrics:level", "In Home Feedback Module is required");
			}
			
            if(command === "start_timer" && feedbackModuleVDev != null) {
			
                if(args.time && args.priority) {
				
					// if the priority of the new command is larger than the priority of the actual command
					if(args.priority >= vDev.get("metrics:priority")){
					
						var counter;
						vDev.set("metrics:cancel", "0");
					
						// if priority of the new command is equal to the actual priority value and the time is shorter
						if(args.priority == vDev.get("metrics:priority") && args.time < vDev.get("metrics:currentCount")) {
							clearInterval(self.i);
							vDev.set("metrics:time", args.time);
							vDev.set("metrics:currentCount", 0);
							counter = 0;
						
							// send start command to the InHomeFeedbackModule
							feedbackModuleVDev.performCommand("start", {endless: true});
							self.i = setInterval(function(){
									
								// calculate the current timer value
								vDev.set("metrics:currentCount", (vDev.get("metrics:time") - (counter + 1)));
								var text = "Current timer time = " + vDev.get("metrics:currentCount") + " seconds";
								vDev.set("metrics:level", text);
								counter++;
							
								// if the counter has reached the set time value
								if(counter == (vDev.get("metrics:time") - 1)) {
									clearInterval(self.i);
									vDev.set("metrics:currentCount", 0);
									vDev.set("metrics:priority", -1);
									vDev.set("metrics:time", 0);
									vDev.set("metrics:level", "Timer has expired");
									// send a stop command to the InHomeFeedbackModule
									feedbackModuleVDev.performCommand("stop");
									self.controller.addNotification("info", "Turn Off Timer Module has expired for room " + room, "module", "TurnOffTimerModule");
									self.controller.devices.emit(vDev.deviceId + ':TurnOffTimerModule_' + room + '_expired');
								}
								// if the counter was canceled by a stop command
								else if(vDev.get("metrics:cancel") == 1) {
									clearInterval(self.i);
									vDev.set("metrics:currentCount", 0);
									vDev.set("metrics:priority", -1);
									vDev.set("metrics:time", 0);
									vDev.set("metrics:level", "Timer has canceled");
									// send a stop command to the InHomeFeedbackModule
									feedbackModuleVDev.performCommand("stop");
									self.controller.addNotification("info", "Turn Off Timer Module has canceled for room " + room, "module", "TurnOffTimerModule");
									self.controller.devices.emit(vDev.deviceId + ':TurnOffTimerModule_' + room + '_canceled');
								}	
							}, 1000);
						}
						// if the priority of the new command is higher than the actual one
						else if(args.priority > vDev.get("metrics:priority")) {
							clearInterval(self.i);
							vDev.set("metrics:priority" , args.priority);
							vDev.set("metrics:currentCount", 0);
							vDev.set("metrics:time", args.time);
							counter = 0;
						
							// send start command to the InHomeFeedbackModule
							feedbackModuleVDev.performCommand("start", {endless: true});
							self.i = setInterval(function(){
								
								// calculate the current timer value
								vDev.set("metrics:currentCount", (vDev.get("metrics:time") - (counter + 1)));
								var text = "Current timer time = " + vDev.get("metrics:currentCount") + " seconds";
								vDev.set("metrics:level", text);
								counter++;
							
								// if the counter has reached the set time value
								if(counter == (vDev.get("metrics:time") - 1)) {
									clearInterval(self.i);
									vDev.set("metrics:currentCount", 0);
									vDev.set("metrics:priority", -1);
									vDev.set("metrics:time", 0);
									vDev.set("metrics:level", "Timer has expired");
									// send a stop command to the InHomeFeedbackModule
									feedbackModuleVDev.performCommand("stop");
									self.controller.addNotification("info", "Turn Off Timer Module has expired for room " + room, "module", "TurnOffTimerModule");
									self.controller.devices.emit(vDev.deviceId + ':TurnOffTimerModule_' + room + '_expired');
								}
								// if the counter was canceled by a stop command
								else if(vDev.get("metrics:cancel") == 1) {
									clearInterval(self.i);
									vDev.set("metrics:currentCount", 0);
									vDev.set("metrics:priority", -1);
									vDev.set("metrics:time", 0);
									vDev.set("metrics:level", "Timer has canceled");
									// send a stop command to the InHomeFeedbackModule
									feedbackModuleVDev.performCommand("stop");
									self.controller.addNotification("info", "Turn Off Timer Module has canceled for room " + room, "module", "TurnOffTimerModule");
									self.controller.devices.emit(vDev.deviceId + ':TurnOffTimerModule_' + room + '_canceled');
								}
							}, 1000);
						}
					}
				}
			}
			else if(command === "stop") {
				vDev.set("metrics:cancel", "1");
			}
		},
        moduleId: this.id
    });
	
	// set the variables for the room, the event name, the InHomeFeedbackModule ID and the InHomeFeedbackModule object
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

	// for each function for every instance in a room
    self.controller.instances.forEach(function(instance) {

		// check an instance ID equal to a InHomeFeedbackModule ID
        if(instance.moduleId == 'InHomeFeedbackModule') {
            if(instance.params.commonOptions.room == roomId) {
                deviceId = instance.id;
            }
        }
    });

    return deviceId;
};
