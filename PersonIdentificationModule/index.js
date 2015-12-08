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
    this.waitingMinutes = 0.25;
    this.roomVolume = 100000;
    this.correctionFaktor = 1;
    this.measuredata = {
        xList: new Array(),
        yList: new Array(),
        counter: 0,
        startTime: 0
    };
    this.persona = {
        kind: "",
        minPpm: "",
        maxPpm: ""
    };
    this.personas = new Array();

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
                        level: "0",
                        room: -1,
                        correctionFactor: 1,
                        status: false,
                        personCount: "1",
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
    //Variable initialize
    if (vDev.get("metrics:room") === -1) {
        vDev.set("metrics:room", self.config.room);
    }
    ;
    if (vDev.get("metrics:correctionFactor") === 0) {
        vDev.set("metrics:correctionFactor", self.config.correctionFactor);
    }
    ;
    var room = vDev.get("metrics:room");
    this.eventID = vDev.deviceId + ':PersonIdentificationModule_' + room;
    self.config.personas.forEach(function (each) {
        self.personas.push(self.makePersonaByKind(each, self.ppmValue));
    });

    self.roomVolume = self.config.roomHigh * self.config.roomWidth * self.config.roomLength * 1000;
    self.correctionFaktor = vDev.get("metrics:correctionFactor");


    var cO2SensorId = self.config.cO2Sensor;
    var persoCounterId = self.config.personCounter;

    if (cO2SensorId & persoCounterId) {
        self.controller.devices.on(cO2SensorId, "change:metrics:level", function () {
            //some seeing of overdriven measurepoints
            var cO2Device = self.controller.devices.get(cO2SensorId);
            if (self.measuredata.startTime === 0) {
                self.measuredata.startTime = new Date().getTime();
                self.makeMeasurePoint(cO2Device, self.measuredata);
            } else {
                if (self.measuredata.startTime + self.waitingMinutes * 60000 < new Date().getTime()) {
                    self.makeMeasurePoint(cO2Device, self.measuredata);
                    self.line = self.getRegressionLineParameter(self.measuredata, self.line);
                    var delta = ((self.getRegressionLineValue(self.line, self.measuredata.xList[self.measuredata.xList.length - 1])) - (self.getRegressionLineValue(self.line, self.measuredata.xList[0])))
                            * self.correctionFaktor;
                    //eigentlich sollte das immer beim init passieren aber es geht nicht der mist
                    self.readPersonCounter(persoCounterId, self.measuredata);

                    //
                    self.makeStatement(self.identify(delta, self.personas, self.personCount, self.roomVolume, self.waitingMinutes), self);
                    self.controller.addNotification("info", "PersonIdentificationModule " + self.adultFound + "new status" + delta, "module", "PersonIdentificationModule");
                } else {
                    self.makeMeasurePoint(cO2Device, self.measuredata);
                }
            }
        });
    }

    if (persoCounterId) {
        self.controller.devices.on(persoCounterId, "change:metrics:level", function () {
            self.readPersonCounter(persoCounterId, self.measuredata);
            self.makeStatement(false, self);
        });
    }



    self.controller.addNotification("info", "PersonIdentificationModule pc: " + self.personCount, "module", "PersonIdentificationModule");

};


PersonIdentificationModule.prototype.stop = function () {
    // here you should remove all registred listeners
    this.controller.devices.remove("core.start", function () {});
    this.controller.devices.remove(this.config.cO2Sensor, "change:metrics:level", function () {});
    this.controller.devices.remove(this.config.personCounter, "change:metrics:level", function () {});
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

PersonIdentificationModule.prototype.makePersona = function (name, minVLM, maxVLM, ppmValue) {
    return persona = {
        kind: name,
        minPpm: minVLM * ppmValue,
        maxPpm: maxVLM * ppmValue
    };

};

PersonIdentificationModule.prototype.makePersonaByKind = function (kind, ppmValue) {
    switch (kind) {
        case "Man":
            return this.makePersona(kind, 10, 12, ppmValue);
        case "Woman":
            return this.makePersona(kind, 7, 9, ppmValue);
        case "Child":
            return this.makePersona(kind, 4, 6, ppmValue);
    }

};
PersonIdentificationModule.prototype.identify = function (delta, personas, personCount, roomVolume, waitingMinutes) {
    //for this Modul undefined person Count Values
    if (personCount === 0 || personCount > personas.length) {
        return false;
    }

    var minDelta = 0;
    var childsMaxPpm = new Array();
    personas.forEach(function (each) {
        if (each.kind === "Child") {
            childsMaxPpm.push(each.maxPpm);
        }
    });
    for (var count = 0; count < personCount; count++) {
        if (childsMaxPpm.length > 0) {
            minDelta += this.getPpmByRoomAndTime(this.popMaxOfAnIntegerArray(childsMaxPpm), roomVolume, waitingMinutes);
        }
    }
    ;
    this.controller.addNotification("info", "identify" + delta + " u " + minDelta, "module", "PersonIdentificationModule");

    if (delta < minDelta) {
        return false;
    } else {
        return true;
    }
};

PersonIdentificationModule.prototype.getPpmByRoomAndTime = function (ppmOfPerson, roomVolume, waitingMinutes) {
    return   (ppmOfPerson / roomVolume) * waitingMinutes;
};

PersonIdentificationModule.prototype.popMaxOfAnIntegerArray = function (array) {
    var max = null;
    var tCount = 0;
    for (var count = 0; count < array.length; count++) {
        if (max === null) {
            max = array[count];
            tCount = count;
        } else {
            if (max < array[count]) {
                max = array[count];
                tCount = count;
            }
        }
    }
    array.splice(tCount, 1);
    return max;
};

PersonIdentificationModule.prototype.initMeasureData = function (measuredata) {
    measuredata = {
        xList: new Array(),
        yList: new Array(),
        counter: 0,
        startTime: 0
    };
    return measuredata;
};

PersonIdentificationModule.prototype.readPersonCounter = function (persoCounterId, measureData) {
    var personCounterDevice = this.controller.devices.get(persoCounterId);
    this.personCount = personCounterDevice.get("metrics:level");
    this.initMeasureData(measureData);
};

PersonIdentificationModule.prototype.makeStatement = function (bool, self) {
    if (bool) {
        self.adultFound = true;
        self.vDev.set("metrics:level", 1);
        self.vDev.set("metrics:status", true);
        self.controller.devices.emit(self.eventID + '_adult_there');
    } else {
        self.adultFound = false;
        self.vDev.set("metrics:level", 0);
        self.vDev.set("metrics:status", false);
        self.controller.devices.emit(self.eventID + '_no_adult_there');
    }

};