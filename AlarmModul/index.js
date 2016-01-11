/*** AlarmModul Z-Way HA module *******************************************

Version: 1.2.0
(c) 2peaches, 2015
-----------------------------------------------------------------------------
Authors: Alexander Keller
Description: AlarmModul um auf bestimmte Ereignise von Sensoren zu reagieren + Push Notification per externen Dienst.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Klassendefinition, Setup, Instanzieren
// ----------------------------------------------------------------------------

function AlarmModul (id, controller) {
    // Call superconstructor first (AutomationModule)
    AlarmModul.super_.call(this, id, controller);


    var self = this;

    this._testRule = function () {
        self.testRule.call(self, null);
    };

    // Erstellen der Instanzvariablen
    this.timer = null;

    this.isSensorsCanReact = 1;
}

inherits(AlarmModul, AutomationModule);

_module = AlarmModul;

// ----------------------------------------------------------------------------
// --- Modulinstanz instanzieren
// ----------------------------------------------------------------------------

AlarmModul.prototype.init = function (config) {
    AlarmModul.super_.prototype.init.call(this, config);

    var self = this;

    if (config.action.message) {this.message = config.action.message.toString();}
    if (config.action.api_key_sms) {this.api_key_sms = config.action.api_key_sms.toString();};
    if (config.action.api_key_email) {this.api_key_email = config.action.api_key_email.toString();};
    if (config.action.phone) {this.phone = config.action.phone.toString();};
    if (config.action.email) {this.email = config.action.email.toString();}

    this.vDev = this.controller.devices.create({
            deviceId: "AlarmModul_"+ this.id,
            defaults: {
                deviceType: "switchBinary",
                metrics: {
                    level: 'off',
                    icon: 'iconNeww.png',
                    title: 'AlarmModul ' + this.id
                }
            },
            overlay: {metrics: {
				icon: "/ZAutomation/api/v1/load/modulemedia/AlarmModul/iconNeww.png"
			}},
            handler: function(command, args) {
                this.set("metrics:level", command);
                // Timer reseten, wenn AlarmModul an
                if (command === "on") {
                    if (this.timer) {
                        clearTimeout(this.timer);
                    }
                    // Sensoren aktivieren
                    self.isSensorsCanReact = 1;
                    self.controller.addNotification("info", "AlarmModule - ON", "module", "AlarmModule");
                };
                if (command == "off") {
                  http.request({
                      url: 'http://sensor.fh-zwickau.de/index.php?option=com_sensor&task=sensor.setAlarmState&level=off&format=json',
                      type: 'GET',
                      async: true,
                      dataType: "json",
                      error: function(response) {
                          self.controller.addNotification("error", response.statusText, "module", 'HelloWorldModul');
                      }
                  });
                  self.isSensorsCanReact = 0;
                  self.controller.addNotification("info", "AlarmModule - OFF", "module", "AlarmModule");
                }
            },
            moduleId: this.id
        });

    self.attachDetach({device: this.vDev.id}, true);

    self.controller.on("LockDoorModule_locked", function() {
      self.vDev.performCommand("on");
    });
    this.config.tests.forEach(function(test) {
        if (test.testType === "binary") {
            self.attachDetach(test.testBinary, true);
        } else if (test.testType === "multilevel") {
            self.attachDetach(test.testMultilevel, true);
        } else if (test.testType === "remote") {
            self.attachDetach(test.testRemote, true);
        }
    });
};



AlarmModul.prototype.stop = function () {
    var self = this;

    if (this.timer) {
        clearTimeout(this.timer);
    }

    if (this.vDev) {
        self.attachDetach(this.vDev.id, false);
    }

    this.config.tests.forEach(function(test) {
        if (test.testType === "binary") {
            self.attachDetach(test.testBinary, false);
        } else if (test.testType === "multilevel") {
            self.attachDetach(test.testMultilevel, false);
        } else if (test.testType === "remote") {
            self.attachDetach(test.testRemote, false);
        }
    });

    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    AlarmModul.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Modul Methoden
// ----------------------------------------------------------------------------

AlarmModul.prototype.attachDetach = function (test, attachOrDetach) {
    if (attachOrDetach) {
        this.controller.devices.on(test.device, "change:metrics:level", this._testRule);
        this.controller.devices.on(test.device, "change:metrics:change", this._testRule);
    } else {
        this.controller.devices.off(test.device, "change:metrics:level", this._testRule);
        this.controller.devices.off(test.device, "change:metrics:change", this._testRule);
    }
};

AlarmModul.prototype.testRule = function (tree) {

    var res = null,
        topLevel = !tree;
        self = this;

    if (!tree) {
        tree = this.config;
    }

    if (this.vDev.get("metrics:level") == "off")
        return;

    if (!this.isSensorsCanReact) {
        return;
    };

    res = false;
    tree.tests.forEach(function(test) {
        if (test.testType === "multilevel") {
            res = res || self.op(self.controller.devices.get(test.testMultilevel.device).get("metrics:level"), test.testMultilevel.testOperator, test.testMultilevel.testValue);
        } else if (test.testType === "binary") {
            res = res || (self.controller.devices.get(test.testBinary.device).get("metrics:level") === test.testBinary.testValue);
        } else if (test.testType === "remote") {
            var dev = self.controller.devices.get(test.testRemote.device);
            res = res || ((_.contains(["on", "off"], test.testRemote.testValue) && dev.get("metrics:level") === test.testRemote.testValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], test.testRemote.testValue) && dev.get("metrics:change") === test.testRemote.testValue));
        }
    });


    if (topLevel && res) {
        var self = this;

        // Sensor deaktivieren
        self.isSensorsCanReact = 0;
        self.timer = setTimeout(function () {
            // Sensor aktivieren
            self.isSensorsCanReact = 1;
            // Timer zurücksetzen
            self.timer = null;
        }, self.config.timeout*1000);

        // API Key & Telefonummer existiert dann:
        if (self.api_key_sms && self.phone) {
            http.request({
                method: 'POST',
                url: "http://sms.ru/sms/send",
                data: {
                    api_id: self.api_key_sms,
                    to: self.phone,
                    text: self.message
                }
            });
        }

        // API Key mandrillapp & Email existiert dann:
        if (self.api_key_email && self.email) {
            http.request({
                method: 'POST',
                url: "https://mandrillapp.com/api/1.0/messages/send.json",
                data: {
                    key: self.api_key_email,
                    message: {
                        from_email: self.email,
                        to: [{email: self.email, type: "to"}],
                        subject: "Notification from Smart Home",
                        text: self.message
                    }
                }
            });
        }

        // Senden der Notification
        self.controller.addNotification("warning", self.message, "module", "AlarmModul");
        http.request({
            url: 'http://sensor.fh-zwickau.de/index.php?option=com_sensor&task=sensor.setAlarmState&level=on&format=json',
            type: 'GET',
            async: true,
            dataType: "json",
            error: function(response) {
                self.controller.addNotification("error", response.statusText, "module", 'HelloWorldModul');
            }
        });

    }
};

AlarmModul.prototype.op = function (dval, op, val) {
    if (op === "=") {
        return dval === val;
    } else if (op === "!=") {
        return dval !== val;
    } else if (op === ">") {
        return dval > val;
    } else if (op === "<") {
        return dval < val;
    } else if (op === ">=") {
        return dval >= val;
    } else if (op === "<=") {
        return dval <= val;
    }

    return null; // error!!
};
