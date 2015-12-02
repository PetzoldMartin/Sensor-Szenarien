function PersonIdentificationModule(id, controller) {
    PersonIdentificationModule.super_.call(this, id, controller);
}

inherits(PersonIdentificationModule, AutomationModule);
_module = PersonIdentificationModule;
PersonIdentificationModule.prototype.init = function (config) {
    PersonIdentificationModule.super_.prototype.init.call(this, config);
    var self = this;
    this.adultFound = false;
    this.deltaValueLastIntervall = 0;
    this.personCount = 0;
    this.adultCount = 0;

    this.ppmValue = 40000;
    this.volumeLMBorder = 7.5;
    this.waitingMinutes = 0.25;
    this.measuredata = {
        xList: new Array(),
        yList: new Array(),
        counter: 0,
        startTime: 0
    };

    this.measuredata.getLastmeasurement = function () {
        if (this.yList.length === 0) {
            return "no Measurement yet avaible";
        } else {
            return this.yList[this.yList.length - 1];
        }
        ;
    };
    this.line = {
        a: 0,
        b: 0
    };

    var vDev = self.controller.devices.create(
            {
                deviceId: "PersonIdentificationModule_" + this.id,
                defaults: {
                    metrics: {
                        title: "CO2 Sensor Test Modul" + this.id,
                        level: "1",
                        personCount: "",
                        alarmSwitchDeviceId: -1
                    }
                },
                overlay: {
                    deviceType: "switchBinary",
                    metrics: {
                        icon: "/ZAutomation/api/v1/load/modulemedia/PersonIdentificationModule/icon.png"
                    }
                },
                handler: function (command, args) {
                    //TODO Switch maybee
                    switch (command) {
                        case "areThereAdults":
                            return{
                                'code': 1,
                                'there is a Adult': self.adultFound
                            };
                        case "giveData":
                            return{
                                'code': 1,
                                'personCount': self.personCount,
                                'lastDeltaValue': self.measuredata.getLastmeasurement()
                            };
                        case "setPersons":
                            if (args.personCount) {
                                self.personCount = args.personCount;
                                vDev.set("metrics:personCount", self.personCount);
                                return {
                                    'code': 1,
                                    'message': 'OK - the message has been changed to ' + self.personCount
                                };
                            } else {
                                return {
                                    'code': 2,
                                    'message': 'OK - Error - missing parameter >personCount<'
                                };
                            }
                            ;
                        default :
                            return {
                                'code': 2,
                                'message': command + 'is no vaiable command'
                            };
                    }


                },
                moduleId: this.id
            });
    self.vDev = vDev;

    var cO2SensorId = self.config.cO2Sensor;
    if (cO2SensorId) {
        self.controller.devices.on(cO2SensorId, "change:metrics:level", function () {
            //some seeing of overdriven measurepoints
            var cO2Device = self.controller.devices.get(cO2SensorId);
            //self.controller.addNotification("info", "PersonIdentificationModule" + self.id + ": nochanges:", "module", "PersonIdentificationModule");
            //self.controller.devices.emit(vDev.deviceId + ':exampleEmitOfPersonIdentificationModule');
            if (self.measuredata.xList.length === 0) {
                self.measuredata.startTime = new Date().getTime();
                self.makeMeasurePoint(cO2Device, self.measuredata);
            } else {
                if (self.measuredata.startTime + self.waitingMinutes * 60000 < new Date().getTime()) {
                    self.makeMeasurePoint(cO2Device, self.measuredata);
                    self.line = self.getRegressionLineParameter(self.measuredata, self.line);
                    var delta = (self.getRegressionLineValue(self.line, self.measuredata.xList[self.measuredata.xList.length - 1])) - (self.getRegressionLineValue(self.line, self.measuredata.xList[0]));
                    self.measuredata = {
                        xList: new Array(),
                        yList: new Array(),
                        counter: 0,
                        startTime: 0
                    };
                    self.controller.addNotification("info", "PersonIdentificationModule" + self.id + ": the configured cO2Sensor switch changed its level.delta:" + delta + " a:" + self.line.a + " b: " + self.line.b, "module", "PersonIdentificationModule");
                } else {
                    self.makeMeasurePoint(cO2Device, self.measuredata);
                }
            }
        });
    }
    
   var persoCounterId= self.config.personCounter;
   if(persoCounterId){
        self.controller.devices.on(persoCounterId, "change:metrics:level", function () {
       var personCounterDevice=self.controller.devices.get(persoCounterId);
       self.personCount=personCounterDevice.get("metrics:level");
       //self.controller.addNotification("info", "PersonIdentificationModule has see people "+self.personCount , "module", "PersonIdentificationModule");

   });
   }
};


PersonIdentificationModule.prototype.stop = function () {
    // here you should remove all registred listeners
    this.controller.devices.remove(this.config.cO2Sensor, "change:metrics:level", function () {});
    this.controller.devices.on(this.config.personCounter, "change:metrics:level", function () {});
    this.controller.devices.remove("PersonIdentificationModule_" + this.id);
    PersonIdentificationModule.super_.prototype.stop.call(this);

};
// here you can add your own functions ...
PersonIdentificationModule.prototype.makeMeasurePoint = function (CO2Device, measureData) {
    measureData.xList.push((new Date().getTime() - measureData.startTime));
    measureData.yList.push(CO2Device.get("metrics:level"));
    measureData.counter++;
    return measureData;
};

PersonIdentificationModule.prototype.getRegressionLineValue = function (line, x) {
    return line.a * x + line.b;
};

PersonIdentificationModule.prototype.getRegressionLineParameter = function (measuredata, line) {
    var delta = 0;
    var sumXY = 0;
    var sumX = 0;
    var sumY = 0;
    var sumX2 = 0;

    for (var count = 0; count < measuredata.xList.length; count++) {
        sumXY += measuredata.xList[count] * measuredata.yList[count];
        sumX += measuredata.xList[count];
        sumY += measuredata.yList[count];
        sumX2 += measuredata.xList[count] * measuredata.xList[count];
    }
    delta = measuredata.xList.length * sumX2 - (sumX * sumX);
    line.a = (measuredata.xList.length * sumXY - (sumX * sumY)) / delta;
    line.b = ((sumX2 * sumY) - (sumX * sumXY)) / delta;
    return line;
};

PersonIdentificationModule.prototype.getppmChangePerAdult = function (roomVolume) {
    var ppm = this.ppmValue * this.adultMinVolume / roomVolume;
    return ppm;
};

