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
    this.waitingMinutes = 2;
    this.actualPpm = 0;
    this.startTime = new Date().getTime();
    this.mList = [];
    this.counter = 0;

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
                                'lastDeltaValue': self.deltaValueLastIntervall
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
    //CO2Device = self.controller.devices.get(CO2SensorId);
    var tLevel=0;//this.CO2Device.get("metrics:level");
    var tTime=new Date().getTime();

    if (CO2SensorId) {
        self.controller.devices.on(CO2SensorId, "change:metrics:level", function () {
            var CO2Device = self.controller.devices.get(CO2SensorId);

            if(tLevel===0){
                tLevel=CO2Device.get("metrics:level");
            }
            self.controller.addNotification("info", "CODeltaModul" + self.id + ": nochanges:", "module", "DeltaCO2Modul");
            self.controller.devices.emit(vDev.deviceId + ':exampleEmitOfDeltaCO2Modul');

            var nTime = new Date().getTime();
            if (self.startTime + self.waitingMinutes * 60000 < nTime) {
                //next step goto extern function
                var ILevel=CO2Device.get("metrics:level");
                var ITime=new Date().getTime();
                self.mList[self.counter]=tLevel-ILevel/tTime-ITime;
                self.counter++;
                tLevel=ILevel;
                tTime=ITime;
                self.controller.addNotification("info", "CODeltaModul" + self.id + ": new m ", "module", "DeltaCO2Modul");
                
                self.counter=0;
                var delta=0;
                var timeDelta=self.startTime-new Date().getTime();
                for(var index = 0; index < self.mList.length; index++) {
                  
                  delta+=self.mList[index];
                }
                var ppmDelta=delta/timeDelta;
                self.controller.addNotification("info", "CODeltaModul" + self.id + ": the configured CO2Sensor switch changed its level.delta:" + ppmDelta+" : "+ timeDelta, "module", "DeltaCO2Modul");
                //self.controller.devices.emit(vDev.deviceId + ':exampleEmitOfDeltaCO2Modul');
                self.startTime=new Date().getTime();
            }else{
                 //next step goto extern function
                var ILevel=CO2Device.get("metrics:level");
                var ITime=new Date().getTime();
                self.mList[self.counter]=tLevel-ILevel/tTime-ITime;
                self.counter++;
                tLevel=ILevel;
                tTime=ITime;
                self.controller.addNotification("info", "CODeltaModul" + self.id + ": new m ", "module", "DeltaCO2Modul");

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

DeltaCO2Modul.prototype.getppmChangePerAdult = function (roomVolume) {
    var ppm = this.ppmValue * this.adultMinVolume / roomVolume;
    return ppm;
};

