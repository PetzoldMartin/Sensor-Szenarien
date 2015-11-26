/* TurnOffTimerModul
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

function TurnOffTimerModul (id, controller) {
    // Call superconstructor first (AutomationModule)
    TurnOffTimerModul.super_.call(this, id, controller);
}

inherits(TurnOffTimerModul, AutomationModule);
_module = TurnOffTimerModul;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TurnOffTimerModul.prototype.init = function (config) {
    TurnOffTimerModul.super_.prototype.init.call(this, config);

    var self = this;
	
    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "TurnOffTimerModul_" + this.id,
        defaults: {
            metrics: {
                title: 'Turn Off Timer Modul ' + this.id,
				level: '',
				cancel: 0
            }
        },
        overlay: {
            deviceType: "sensorMultilevel",
			metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/TurnOffTimerModul/icon.png"
			}
        },
		handler: function (command, args) {
            if(command === "start_timer") {
                if(args.time) {
					vDev.set("metrics:cancel", "0");
					var counter = 0;
					var i = setInterval(function(){
					
						var currentCount = args.time - (counter + 1);
						var text = "Current timer time = " + currentCount + " seconds";
						vDev.set("metrics:level", text);
						counter++;
						
						if(counter == (args.time - 1)) {
							vDev.set("metrics:level", "Timer has expired");
							self.controller.addNotification("info", "Turn Off Timer Modul with Id has expired", "module", "TurnOffTimerModul");
							self.controller.devices.emit('turn_off_timer_modul_' + this.id + '_expired');
							clearInterval(i);
						}
						else if(vDev.get("metrics:cancel") == 1) {
							vDev.set("metrics:level", "Timer has canceled");
							self.controller.addNotification("info", "Turn Off Timer Modul with Id has canceled", "module", "TurnOffTimerModul");
							self.controller.devices.emit('turn_off_timer_modul_' + this.id + '_canceled');
							clearInterval(i);
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
	vDev.set("metrics:level", "Timer is ready");
};

TurnOffTimerModul.prototype.stop = function () {    
    this.controller.devices.remove("TurnOffTimerModul_" + this.id);

    TurnOffTimerModul.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
