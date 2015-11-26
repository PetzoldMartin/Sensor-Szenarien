// TODO
// - configuration parameters
// - events

/* In Home Feedback Module
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Patrick Hecker <pah111kg@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InHomeFeedbackModule (id, controller) {
    // Call superconstructor first (AutomationModule)
    InHomeFeedbackModule.super_.call(this, id, controller);
}

inherits(InHomeFeedbackModule, AutomationModule);

_module = InHomeFeedbackModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

InHomeFeedbackModule.prototype.init = function (config) {
    InHomeFeedbackModule.super_.prototype.init.call(this, config);

    var self = this;

    // Initialize additional libraries
    // https://github.com/jakesgordon/javascript-state-machine
    var file = "/userModules/InHomeFeedbackModule/lib/state-machine.js";
    var stat = fs.stat(file);
    if (stat && stat.type === "file") {
        executeFile(file);
    } else {
        // TODO: Error
    }

    // Initialize a finite state machine for light control
    self.fsm = self.initFSM();

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "InHomeFeedbackModule_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'In Home Feedback Module ' + this.id,
                level: 0,
                roomId: -1
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'switchBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/InHomeFeedbackModule/icon.png"
			}
        },
        handler: function (command, args) { // processing of incoming commands over ZAutomation API
            // try it: http://localhost:8083/ZAutomation/api/v1/devices/InHomeFeedbackModule_42/command/c1?p1=42
            // ! pay attention to your actual virtual device id 'InHomeFeedbackModule_42'
			
			// pass commands to state machine
            if (self.fsm.hasOwnProperty(command)) {
				
				// check if event is allowed in current state
				if(self.fsm.can(command)) {
                    
					if (command === "start") {
						// store duration in module object to get access in transition of state machine
						self.duration = self.config.duration;
						if (args.duration) {
							self.duration = args.duration;
						}
					}
					
					if (command == "defer") {
						// store defer in module object to get access in transition of state machine
						self.defermentDuration = self.config.deferment;
						if (args.duration) {
							self.defermentDuration = args.duration;
						}
					}
					
					// ... transition
					self.fsm[command]();
					
					return {
                        'code': 0,
                        'message': 'OK - command processed.'
                    }
                } else {
                    return {
                        'code': 2,
                        'message': 'Error - command is not allowed in state ' + self.fsm.current + '!',
                        'allowed': self.fsm.transitions()
                    }
                }
            } else {
                return {
                    'code': 1,
                    'message': 'Error - command is not definied!'
                }
            }
        },
        moduleId: this.id
    });
    self.vDev = vDev;

    // save the room id in metrics:roomId field of virtual device
    if(self.config.room) {
        vDev.set("metrics:roomId", self.config.room);
    }

    // add listener for cancel switch
    if(self.config.cancelSwitch) {
        self.controller.devices.on(self.config.cancelSwitch, "change:metrics:level", function() {
            self.fsm.cancel();
        });
    }

    // setup the defer switchtes
    self.config.deferSwitches.forEach(function(el) {
        self.controller.devices.on(el.deferSwitch, "change:metrics:level", function() {
            self.defermentDuration = el.deferSwitchDuration;

            self.fsm.defer();
        });
    });
};

InHomeFeedbackModule.prototype.stop = function () {
    var self = this;

    self.stopAllFeedbackMechanism();

    self.controller.devices.off(self.config.cancelSwitch, "change:metrics:level", function() {});

    self.controller.devices.remove("InHomeFeedbackModule_" + self.id);

    InHomeFeedbackModule.super_.prototype.stop.call(self);
};

InHomeFeedbackModule.prototype.stopAllFeedbackMechanism = function () {
    var self = this;

    self.stopVisualActuatorsMechanism();
    self.stopFeedbackModuleTimer();
};

InHomeFeedbackModule.prototype.startVisualActuatorsMechanism = function () {
    var self = this;
    var visualActuatorsActive = false;

    // save previous level
    self.visualActuatorsPreviousState = new Array();
    if (self.config.visualActuators) {
        self.config.visualActuators.forEach(function(el) {
            var vDev = self.controller.devices.get(el);

            self.visualActuatorsPreviousState.push(new Array(el, vDev.get('deviceType'), vDev.get("metrics:level")));
        });
    }

    // check if any visual actuators are configured
    if (self.config.visualActuators) {
        // run endless loop (on-off-on-off-on-...)
        self.visualActuatorsTimer = setInterval(function() {
            if (visualActuatorsActive) {
                self.config.visualActuators.forEach(function(el) {
                    var vDev = self.controller.devices.get(el);

                    if (vDev) {
                        var deviceType = vDev.get("deviceType");

                        if (deviceType === "switchBinary") {
                            //vDev.set("metrics:level", 'off');
                            vDev.performCommand("off");
                        } else if (deviceType === "switchMultilevel") {
                            //vDev.set("metrics:level", '0');
                            vDev.performCommand("exact", { level: 0 });
                        }
                    }
                });
                visualActuatorsActive = false;
            } else {
                self.config.visualActuators.forEach(function(el) {
                    var vDev = self.controller.devices.get(el);

                    if (vDev) {
                        var deviceType = vDev.get("deviceType");

                        if (deviceType === "switchBinary") {
                            //vDev.set("metrics:level", 'on');
                            vDev.performCommand("on");
                        } else if (deviceType === "switchMultilevel") {
                            //vDev.set("metrics:level", '99');
                            vDev.performCommand("exact", { level: 99 });
                        }
                    }
                });
                visualActuatorsActive = true;
            }
        }, 2 * 1000);
    }
};

InHomeFeedbackModule.prototype.stopVisualActuatorsMechanism = function () {
    var self = this;

    if (self.visualActuatorsTimer) {
        clearInterval(self.visualActuatorsTimer);

        // restore previous level
        if(self.visualActuatorsPreviousState) {
            for	(index = 0; index < self.visualActuatorsPreviousState.length; index++) {

                // self.visualActuatorsPreviousState[index][0] - deviceId
                // self.visualActuatorsPreviousState[index][1] - deviceType
                // self.visualActuatorsPreviousState[index][2] - level

                var vDev = self.controller.devices.get(self.visualActuatorsPreviousState[index][0]);

                if(vDev) {
                    if (self.visualActuatorsPreviousState[index][1] === "switchBinary") {
                        vDev.performCommand(self.visualActuatorsPreviousState[index][2]);
                    } else if (self.visualActuatorsPreviousState[index][1] === "switchMultilevel") {
                        vDev.performCommand("exact", { level: self.visualActuatorsPreviousState[index][2] });
                    }
                }
            }
        }
    }
};

InHomeFeedbackModule.prototype.startFeedbackModuleTimer = function (duration) {
    var self = this;

    var remainingTime = duration
    self.feedbackModuleTimer = setInterval(function() {
        self.vDev.set("metrics:level", remainingTime + " Sekunden");
        remainingTime--;
    }, 1 * 1000);
};

InHomeFeedbackModule.prototype.stopFeedbackModuleTimer = function () {
    var self = this;

    if (self.feedbackModuleTimer) {
        clearInterval(self.feedbackModuleTimer);
        self.vDev.set("metrics:level", "Pause");
    }
};

InHomeFeedbackModule.prototype.initFSM = function() {
    var self = this;
    var fsm = StateMachine.create({
        initial: 'pause',
        // definition of an own error handler (exceptions are thrown by default which appear on user interface)
        error: function(eventName, from, to, args, errorCode, errorMessage) {
            console.log("Problem in state machine (" + errorMessage + ")");
        },
        events: [
            // event names equals tranistions, they can be called on state machine
            { name: 'start',     from: 'pause',                to: 'active'   },
            { name: 'defer',     from: 'active',               to: 'deferred' },
            { name: 'continue',  from: 'deferred',             to: 'active'   },
            { name: 'stop',      from: ['active', 'deferred'], to: 'pause'    },
            { name: 'cancel',    from: ['active', 'deferred'], to: 'pause'    },
            { name: 'timeout',   from: 'active',               to: 'pause'    }
        ],
        callbacks: {
            // callbacks for transitions

            // onEVENT - shorthand for onafterEVENT

            onstart: startTrans,
            ondefer: deferTrans,
            oncontinue: continueTrans,
            onstop: stopTrans,
            oncancel: cancelTrans,
            ontimeout: timeoutTrans,

            // onSTATE - shorthand for onenterSTATE

            onpause: function(event, from, to) {
                // !
            },
            onactive: function(event, from, to) {
                // start counter at ui
                self.startFeedbackModuleTimer(self.duration);

                // start feedback mechanism
                self.startVisualActuatorsMechanism();

                // start automatic termination timeout
                self.timeout = setTimeout(function() {
                    self.fsm.timeout();
                }, self.duration * 1000);
            },
            ondeferred: function(event, from, to) {
                self.defermentTimer = setTimeout(function() {
                    self.fsm.continue();
                }, self.defermentDuration * 1000);
            },

            // onleaveSTATE

            onleaveactive: function(event, from, to) {
                // cancel feedback mechanism
                self.stopAllFeedbackMechanism();

                if (self.timeout) {
                    // remove automatic termination timeout
                    clearTimeout(self.timeout);
                }
            },

            onleavedeferred: function(event, from, to) {
                if (self.defermentTimer) {
                    // remove automatic continuation timeout
                    clearTimeout(self.defermentTimer);
                }
            },

            // log current state
            onenterstate: function(event, from, to) {
                self.controller.addNotification("info", "InHomeFeedbackModule state from: " + from + " to: " + to + " (Event: " + event + ")", "module", "InHomeFeedbackModule");
            }
        }
    });

    function startTrans(event, from, to) {
        self.controller.addNotification("info", "InHomeFeedbackModule start feedback mechanism for the next " + self.duration + " seconds.", "module", "InHomeFeedbackModule");

        // emit event: [deviceId]:feedback_module_[roomId]_started
        self.controller.devices.emit(self.vDev.deviceId + ':feedback_module_' + self.vDev.get("metrics:roomId") + '_started');
    };

    function deferTrans(event, from, to) {
        self.controller.addNotification("info", "InHomeFeedbackModule defer feedback mechanism for the next " + self.defermentDuration + " seconds.", "module", "InHomeFeedbackModule");

        // emit event: [deviceId]:feedback_module_[roomId]_deferred
        self.controller.devices.emit(self.vDev.deviceId + ':feedback_module_' + self.vDev.get("metrics:roomId") + '_deferred');
    };

    function continueTrans(event, from, to) {
        self.controller.addNotification("info", "InHomeFeedbackModule continue feedback mechanism.", "module", "InHomeFeedbackModule");

        // emit event: [deviceId]:feedback_module_[roomId]_continued
        self.controller.devices.emit(self.vDev.deviceId + ':feedback_module_' + self.vDev.get("metrics:roomId") + '_continued');
    };

    function stopTrans(event, from, to) {
        self.controller.addNotification("info", "In Home Feedback Module stopped manually feedback mechanism,", "module", "InHomeFeedbackModule");

        // emit event: [deviceId]:feedback_module_[roomId]_stopped_manual
        self.controller.devices.emit(self.vDev.deviceId + ':feedback_module_' + self.vDev.get("metrics:roomId") + '_stopped_manual');
    };

    function timeoutTrans(event, from, to) {
        self.controller.addNotification("info", "In Home Feedback Module stopped normally feedback mechanism", "module", "InHomeFeedbackModule");

        // emit event: [deviceId]:feedback_module_[roomId]_stopped_normal
        self.controller.devices.emit(self.vDev.deviceId + ':feedback_module_' + self.vDev.get("metrics:roomId") + '_stopped_normal');
    }

    function cancelTrans(event, from, to) {
        self.controller.addNotification("info", "In Home Feedback Module canceled feedback mechanism by user.", "module", "InHomeFeedbackModule");

        // emit event: [deviceId]:feedback_module_[roomId]_canceled_by_user
        self.controller.devices.emit(self.vDev.deviceId + ':feedback_module_' + self.vDev.get("metrics:roomId") + '_canceled_by_user');
    };

    return fsm;
}
