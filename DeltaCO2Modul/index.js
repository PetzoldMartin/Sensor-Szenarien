function DeltaCO2Modul(id, controller) {
    DeltaCO2Modul.super_.call(this, id, controller);
}

inherits(DeltaCO2Modul, AutomationModule);
_module = DeltaCO2Modul;
DeltaCO2Modul.prototype.init = function (config) {
    DeltaCO2Modul.super_.prototype.init.call(this, config);
    var self = this;
    this.adultFound = false;
    this.deltaValueLastIntervall = 0;
    this.personCount = 0;
    this.ppmValue = 40000;
    this.adultMinVolume = 8;
    this.waitingMinutes = 0.25;
    this.measuredata = {
        xList: new Array(),
        yList: new Array(),
        counter: 0,
        startTime: 0
    };
    
    this.measuredata.getLastmeasurement=function(){
      if( this.yList.length===0){
          return "no Measurement yet avaible";
      }else{
         return this.yList[this.yList.length-1] ;
      };  
    };
    this.line = {
        a: 0,
        b: 0
    };

    var vDev = self.controller.devices.create(
            {
                deviceId: "DeltaCO2Modul_" + this.id,
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
                        icon: "/ZAutomation/api/v1/load/modulemedia/DeltaCO2Modul/icon.png"
                    }
                },
                handler: function (command, args) {
                    if (command === "areThereAdults") {
                        return self.adultFound;
                    } else {
                        if (command === "giveData") {
                            return {
                                'personCount': self.personCount,
                                'lastDeltaValue': self.measuredata.getLastmeasurement()
                            };
                        } else {
                            if (command === "setPersons") {
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
                        }
                    }
                },
                moduleId: this.id
            });
    self.vDev = vDev;


    var CO2SensorId = self.config.CO2Sensor;
    //var CO2Device2 = self.controller.devices.get(CO2SensorId);
    //var tLevel=CO2Device2.get("metrics:level");


    if (CO2SensorId) {
        self.controller.devices.on(CO2SensorId, "change:metrics:level", function () {
            var CO2Device = self.controller.devices.get(CO2SensorId);
            self.controller.addNotification("info", "CODeltaModul" + self.id + ": nochanges:", "module", "DeltaCO2Modul");
            //self.controller.devices.emit(vDev.deviceId + ':exampleEmitOfDeltaCO2Modul');
            if (self.measuredata.xList.length === 0) {
                self.measuredata.startTime = new Date().getTime();
                self.makeMeasurePoint(CO2Device, self.measuredata);
                    //self.controller.addNotification("info", "CODeltaModul" + self.id + ": new m " + self.measuredata.yList[self.measuredata.counter - 1] + "time:"+self.measuredata.xList[self.measuredata.counter - 1]+ " counter: " + self.measuredata.counter, "module", "DeltaCO2Modul");

            } else {
                if (self.measuredata.startTime + self.waitingMinutes * 60000 < new Date().getTime()) {
                    self.makeMeasurePoint(CO2Device, self.measuredata);
                    self.line = self.getRegressionLineParameter(self.measuredata, self.line);
                    var delta =(self.getRegressionLineValue(self.line, self.measuredata.xList[self.measuredata.xList.length - 1])) - (self.getRegressionLineValue(self.line, self.measuredata.xList[0]));
                    self.measuredata = {
                        xList: new Array(),
                        yList: new Array(),
                        counter: 0,
                        startTime: 0
                    };
                    self.controller.addNotification("info", "CODeltaModul" + self.id + ": the configured CO2Sensor switch changed its level.delta:" + delta + " a:" + self.line.a + " b: " + self.line.b, "module", "DeltaCO2Modul");
                } else {
                    self.makeMeasurePoint(CO2Device, self.measuredata);
                    //self.controller.addNotification("info", "CODeltaModul" + self.id + ": new m " + self.measuredata.yList[self.measuredata.counter - 1] + "time:"+self.measuredata.xList[self.measuredata.counter - 1]+ " counter: " + self.measuredata.counter, "module", "DeltaCO2Modul");

                }
            }
        });
    }
};


DeltaCO2Modul.prototype.stop = function () {
    // here you should remove all registred listeners

    this.controller.devices.remove("DeltaC02Modul_" + this.id);
    this.controller.devices.on(this.config.CO2Sensor, "change:metrics:level", function () {});
    DeltaCO2Modul.super_.prototype.stop.call(this);
};
// here you can add your own functions ...
DeltaCO2Modul.prototype.makeMeasurePoint = function (CO2Device, measureData) {
    measureData.xList.push((new Date().getTime() - measureData.startTime));
    measureData.yList.push(CO2Device.get("metrics:level"));
    measureData.counter++;
    return measureData;

};

DeltaCO2Modul.prototype.getRegressionLineValue = function (line, x) {
    return line.a * x + line.b;
};

DeltaCO2Modul.prototype.getRegressionLineParameter = function (measuredata, line) {
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
    line.a = (measuredata.xList.length * sumXY - (sumX *sumY)) / delta;
    line.b = ((sumX2 * sumY) - (sumX * sumXY)) / delta;
    return line;




};

DeltaCO2Modul.prototype.getppmChangePerAdult = function (roomVolume) {
    var ppm = this.ppmValue * this.adultMinVolume / roomVolume;
    return ppm;
};

