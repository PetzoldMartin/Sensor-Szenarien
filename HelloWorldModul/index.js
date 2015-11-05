/* HelloWorld module
 *
 * Version: 1.1.0
 * 2015
 *
 * Author: Patrick Hecker <pah111kg@fh-zwickau.de>, Simon Schwabe <sis111su@fh-zwickau.de>
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function HelloWorldModul (id, controller) {
    // Call superconstructor first (AutomationModule)
    HelloWorldModul.super_.call(this, id, controller);

    // instance variable
    this.instanceVariable = "value is deleted when you restart the server";
}

inherits(HelloWorldModul, AutomationModule);

_module = HelloWorldModul;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// --- This function is call on every server start.
// ----------------------------------------------------------------------------

HelloWorldModul.prototype.init = function (config) {
    HelloWorldModul.super_.prototype.init.call(this, config);

    var self = this;

    // *********************************
    // *** Virtual Device Definition ***
    // *********************************

	// This object defines the interface for the ZAutomation API and the UI (Elements)
	var vDev = self.controller.devices.create({
        deviceId: "HelloWorldModul_" + this.id, // identifier for ZAutomation API
        // 'defaults' contains the initial values for the UI when the module is created
        defaults: {
            metrics: {
                title: 'Hello World Modul ' + this.id,
                level: '',
                customValue: '', // this value isn't deleted after a restart
                alarmSwitchDeviceId: -1
            }
        },
        // 'overlay' defines, how an module is presented in UI view 'Elements'
        // e.g. deviceType: 'switchBinary' has an On/Off toggle button
        overlay: {
            deviceType: "sensorMultilevel", // this deviceType enables the module as condition for logical rules
            metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/HelloWorldModul/icon.png"
			}
        },
        handler: function (command, args) { // processing of incoming commands over ZAutomation API
            // try it: http://localhost:8083/ZAutomation/api/v1/devices/HelloWorldModul_23/command/sayHello?name=Bar
            // ! pay attention to your actual virtual device id 'HelloWorldModul_23'
            if(command === "sayHello") {
                if(args.name) {
                    // change level of virtual device, will change the output of ui element ...
                    var text = "Hello, " + args.name;
                    vDev.set("metrics:level", text);

                    // see event view of smart home ui ...
                    self.controller.addNotification("info", "Hello World Modul with Id " + self.id + " said " + text + ".", "module", "HelloWorldModul");

                    // send a response: all OK ...
                    return {
                        'code': 1,
                        'message': 'OK - the message has been changed to ' + text
                    }
                } else {
                    // send a response: missing parameter ...
                    return {
                        'code': 2,
                        'message': 'OK - Error - missing parameter >name<'
                    }
                }
			}
        },
        moduleId: this.id
    });

    // save virtual device obejct for later use (outside the scope of this function)
    self.vDev = vDev;

    // ******************************************
    // *** Access to configuration parameters ***
    // ******************************************

    // 1. simple numeric value ...
    var exampleParameter = self.config.exampleParameter; // this.config contains all parameter values (look in module.json for the keyword 'exampleParameter')
    // see event view of smart home ui ...
    self.controller.addNotification("info", "Hello World Modul with Id " + self.id + " configured with example parameter = " + exampleParameter + ".", "module", "HelloWorldModul");

    // 2. another parameter, as an example for a virtual device
    // this demonstrates the connection between the HelloWorldModul and the selected switchBinary from setup
    var otherVirtualDeviceId = self.config.otherVirtualDevice; // for example: DummyDevice_1
    if(otherVirtualDeviceId) {
        // sign up for an event (see also in stop function)
        self.controller.devices.on(otherVirtualDeviceId, "change:metrics:level", function() {
            // this callback function will is called, when the level of the configured switch changed (off->on or on->off)
            self.controller.addNotification("info", "Hello World Modul with Id " + self.id + ": the configured binary switch changed its level.", "module", "HelloWorldModul");

            // emit an event to devices event bus
            self.controller.devices.emit(vDev.deviceId + ':exampleEmitOfHelloWorld');
        });
    }

    // ***************************************
    // *** Change custom value of metrics  ***
    // ***************************************
    vDev.set("metrics:customValue", new Date().getTime());

    // sign up for the own emitted event (see also in stop function)
    self.controller.devices.on("HelloWorldModul_" + self.id, "exampleEmitOfHelloWorld", function() {
        self.controller.addNotification("info", "Hello World Modul with Id " + self.id + ": received a message of my own emitted event ", "module", "HelloWorldModul");
    });

    // *************************************************************************************************
    // *** Create an alarm switch, which submits a corresponding HTTP request depending on the state ***
    // *************************************************************************************************

    // Wait for event core.start, which indicates, that all modules are loaded.
    // Otherwise an exception will be thrown, because the module can not be used.
    // ATTENTION!
    // This is only called when the system starts, this implies, that new modules
    // are after restarts only!
    self.controller.on("core.start", function() {
        // first check if one switch exist, if not create one and save the id
        if(vDev.get("metrics:alarmSwitchDeviceId") === -1) {
            // create alarm switch device and store new device id
            var alarmSwitchDeviceId = self.createAlarmSwitch(); // for example: DummyDevice_1

            // save the alarm switch id in metrics field of virtual device, the value remains available after a restart
            vDev.set("metrics:alarmSwitchDeviceId", alarmSwitchDeviceId);
        }

        // configure listeners for the specific alarm switch device
        self.controller.devices.on(vDev.get("metrics:alarmSwitchDeviceId"), "change:metrics:level", function() {
            // load virtual device object
            var alarmSwitchDevice = self.controller.devices.get(vDev.get("metrics:alarmSwitchDeviceId"));

    		if(alarmSwitchDevice) {
                // get actual state of alarm switch device (on | off)
    			var actLevel = alarmSwitchDevice.get("metrics:level");

                if(actLevel === 'on') {
                    if(config.alarmStartUrl) {
                        // start alarm by sending a HTTP request
                        http.request({
                            url: config.alarmStartUrl,
                            type: 'GET',
                            async: true,
							dataType: "json",
                            error: function(response) {
                                self.controller.addNotification("error", response.statusText, "module", 'HelloWorldModul');
                            }
                        });
                    }
                } else if(actLevel === 'off') {
                    if(config.alarmStopUrl) {
                        // stop alarm by sending a HTTP request
                        http.request({
                            url: config.alarmStopUrl,
                            type: 'GET',
                            async: true,
							dataType: "json",
                            error: function(response) {
                                self.controller.addNotification("error", response.statusText, "module", 'HelloWorldModul');
                            }
                        });
                    }
                }
    		}
        });
    });
};

HelloWorldModul.prototype.stop = function () {
    // unregister events
    this.controller.devices.off(this.config.other_virtual_device, "change:metrics:level", function() {});
    this.controller.devices.off("HelloWorldModul_" + this.id, "exampleEmitOfHelloWorld", function() {});
    this.controller.devices.off(this.vDev.get("metrics:alarmSwitchDeviceId"), "change:metrics:level", function() {});

    this.controller.devices.remove("HelloWorldModul_" + this.id);

    HelloWorldModul.super_.prototype.stop.call(this);
};

HelloWorldModul.prototype.createAlarmSwitch = function () {
	var self = this;

    // create a new module (instance)
    var result = self.controller.createInstance({
        "instanceId": "0",
        "moduleId": "DummyDevice",
        "active": "true",
        "title": "Dummy Device",
        "description": "...",
        "params": {
            "deviceType": "switchBinary"
        }
    });

    // rename virtual device
    var alarmSwitchDevice = self.controller.devices.get("DummyDevice_" + result.id);
    alarmSwitchDevice.set({'metrics': {'title': 'Alarm Switch ' + result.id, 'level': 'off'}});

	return "DummyDevice_" + result.id; // device id
}
