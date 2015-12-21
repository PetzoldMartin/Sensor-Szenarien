function PersonIdentificationModule(id, controller) {
    PersonIdentificationModule.super_.call(this, id, controller);
}

inherits(PersonIdentificationModule, AutomationModule);
_module = PersonIdentificationModule;
PersonIdentificationModule.prototype.init = function (config) {
    PersonIdentificationModule.super_.prototype.init.call(this, config);
    var self = this;
    this.highmeasureWaitingtime = 2000;
    this.adultFound = false;
    this.deltaValueLastIntervall = 0;
    this.personCount = 0;
    this.adultCount = 0;
    this.ppmValue = 40000;
    this.waitingMinutes = 2;
    this.roomVolume = 100000;
    this.correctionFactor = 1;

    this.highGetData = {
        lastHighMeasurepoint: 0,
        lastPValue: 0,
        value: 0
    };
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
    this.doorWindowContactsIds = new Array();
    this.peopleSizeMeasurementIds = new Array();

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
                        level: "off",
                        room: -1,
                        correctionFactor: 1,
                        status: false,
                        personCount: 0,
                        adultCount: 0,
                        runningState: true,
                        alarmSwitchDeviceId: -1,
                        highmeasureWaitingtime: 1,
                        debug: false,
                    }
                },
                overlay: {
                    deviceType: "switchBinary",
                    metrics: {
                        icon: "/ZAutomation/api/v1/load/modulemedia/PersonIdentificationModule/icon.png"
                    }
                },
                handler: function (command, args) {
                    switch (command) {
                        case "areThereAdults":
                            return{
                                'code': 1,
                                'there is a Adult': self.adultFound
                            };
                        case "start":
                            vDev.set("metrics:runningState", true);
                            self.controller.devices.emit(self.eventID + '_started');

                            return{
                                'code': 1,
                                'debug State': vDev.get("metrics:runningState")
                            };
                        case "stop":
                            vDev.set("metrics:runningState", false);
                            self.controller.devices.emit(self.eventID + '_started');


                            return{
                                'code': 1,
                                'debug State': vDev.get("metrics:runningState")
                            };
                        case "debugOff":
                            vDev.set("metrics:debug", false);

                            return{
                                'code': 1,
                                'debug State': vDev.get("metrics:debug")
                            };
                        case "debugOn":
                            vDev.set("metrics:debug", true);

                            return{
                                'code': 1,
                                'debug State': vDev.get("metrics:debug")
                            };
                        case "giveData":
                            return{
                                'code': 1,
                                'personCount': self.personCount,
                                'lastDeltaValue': self.measuredata.getLastmeasurement()
                            };
                        case "setCorrectionFactor":
                            if (args.correctionFactor) {
                                self.correctionFactor = args.correctionFactor;
                                vDev.set("metrics:correctionFactor", self.correctionFactor);
                                return {
                                    'code': 1,
                                    'message': 'OK - the correctionFactor has been changed to ' + self.correctionFactor
                                };
                            } else {
                                return {
                                    'code': 2,
                                    'message': 'OK - Error - missing parameter >correctionFactor<'
                                };
                            }
                            ;
                        case "setMeasureTimeDelta":
                            if (args.highmeasureWaitingtime) {
                                self.highmeasureWaitingtime = args.highmeasureWaitingtime;
                                vDev.set("metrics:highmeasureWaitingtime", self.highmeasureWaitingtime);
                                return {
                                    'code': 1,
                                    'message': 'OK - the highmeasureWaitingtime has been changed to ' + self.highmeasureWaitingtime
                                };
                            } else {
                                return {
                                    'code': 2,
                                    'message': 'OK - Error - missing parameter >highmeasureWaitingtime<'
                                };
                            }
                            ;
                        case "setPersons":
                            if (args.personCount) {
                                self.personCount = args.personCount;
                                vDev.set("metrics:personCount", self.personCount);
                                return {
                                    'code': 1,
                                    'message': 'OK - the personCount has been changed to ' + self.personCount
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
    vDev.set("metrics:level", "off");
    self.personCount = vDev.get("metrics:personCount");
    self.adultCount = vDev.get("metrics:adultCount");
    if (vDev.get("metrics:room") === -1) {
        vDev.set("metrics:room", self.config.room);
    }
    ;
    if (vDev.get("metrics:highmeasureWaitingtime") === 1) {
        vDev.set("metrics:highmeasureWaitingtime", self.config.highmeasureWaitingtime);
    }
    ;
    if (vDev.get("metrics:correctionFactor") === 1) {
        vDev.set("metrics:correctionFactor", self.config.correctionFactor);
    }
    ;

    var room = vDev.get("metrics:room");
    this.eventID = vDev.deviceId + ':PersonIdentificationModule_' + room;
    self.config.personas.forEach(function (each) {
        self.personas.push(self.makePersonaByKind(each, self.ppmValue));
    });

    self.roomVolume = (self.config.roomHigh * self.config.roomWidth * self.config.roomLength) / 1000;
    self.correctionFactor = vDev.get("metrics:correctionFactor");


    var cO2SensorId = self.config.cO2Sensor;
    var persoCounterId = self.config.personCounter;

    if (cO2SensorId) {
        self.controller.devices.on(cO2SensorId, "change:metrics:level", function () {
            if (vDev.get("metrics:runningState")) {
                if (self.lookAfterOpenDandW(self.config.doorWindowContacts, self)) {

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
                                    * self.correctionFactor;
                            //eigentlich sollte das immer beim init passieren aber es geht nicht der mist
                            self.readPersonCounter(persoCounterId, self.measuredata);

                            //
                            self.makeStatement(self.identify(delta, self.personas, self.personCount, self.roomVolume, self.waitingMinutes, self.adultCount), self);
                            if (self.vDev.get("metrics:debug")) {
                                self.controller.addNotification("info", "PersonIdentificationModule " + self.adultFound + " new status " + delta, "module", "PersonIdentificationModule");
                            }
                            //self.initMeasureData(self.measuredata);
                        } else {
                            self.makeMeasurePoint(cO2Device, self.measuredata);
                        }
                    }
                }
            }
        });
    }

    if (persoCounterId) {
        self.controller.devices.on(persoCounterId, "change:metrics:level", function () {
            if (vDev.get("metrics:runningState")) {
                var pcOld = self.personCount;
                self.readPersonCounter(persoCounterId, self.measuredata);
                self.makeStatement(false, self);
                self.highGetData.lastPValue = new Date().getTime();
                self.highGetData.value = self.personCount - pcOld;
                self.lookForAdult(self);
            }
        });
    }

    self.config.doorWindowContacts.forEach(
            function (each) {
                self.controller.devices.on(each, "change:metrics:level", function () {
                    if (vDev.get("metrics:runningState")) {
                        self.makeStatement(false, self);
                    }
                });
            }
    );
    self.config.peopleSizeMeasurement.forEach(
            function (each) {
                self.controller.devices.on(each, "change:metrics:level", function () {
                    if (vDev.get("metrics:runningState")) {
                        if (self.personCount === 0) {
                            self.personCount = self.readPersonCounter(persoCounterId, self.measuredata);

                        }
                        var measurePoint = self.controller.devices.get(each);
                        if (measurePoint.get("metrics:level") === "on") {
                            self.highGetData.lastHighMeasurepoint = new Date().getTime();
                            self.lookForAdult(self);
                        }
                    }
                });
            }
    );
    if (vDev.get("metrics:debug")) {
        self.controller.addNotification("info", "PersonIdentificationModule init Success ", "module", "PersonIdentificationModule");
    }

};


PersonIdentificationModule.prototype.stop = function () {
    // here you should remove all registred listeners
    this.controller.devices.remove("core.start", function () {});
    this.controller.devices.remove(this.config.cO2Sensor, "change:metrics:level", function () {});
    this.controller.devices.remove(this.config.personCounter, "change:metrics:level", function () {});
    this.config.doorWindowContacts.forEach(
            function (each) {
                this.controller.devices.remove(each, "change:metrics:level", function () {});
            }
    );
    this.config.peopleSizeMeasurement.forEach(
            function (each) {
                this.controller.devices.remove(each, "change:metrics:level", function () {});
            }
    );
    this.controller.devices.remove("PersonIdentificationModule_" + this.id);
    PersonIdentificationModule.super_.prototype.stop.call(this);

};

// here you can add your own functions ...

/**
 * The Method Who looks if there is a measurePoint from Highmeasurement and an PersonCounter Change,
 * if there is both it compares the timestamps and resets them
 * @param {PersonIdentificationModule} self the Module who needs a highGetData Object and an highmeasureWaitingtime Variable
 * @returns {nothing}
 */
PersonIdentificationModule.prototype.lookForAdult = function (self) {
    var time = self.highGetData.lastPValue;
    var oTime = self.highGetData.lastHighMeasurepoint;
    var value = self.highGetData.value;
    if (!(time === 0 | oTime === 0)) {
        if (oTime !== 0 & oTime <= time + self.highmeasureWaitingtime & oTime >= time - self.highmeasureWaitingtime) {
            if (value !== 0) {
                self.adultCount += value;
            }
        }
        this.highGetData = {
            lastHighMeasurepoint: 0,
            lastPValue: 0,
            value: 0
        };
    }
    if (self.personCount < self.adultCount) {
        self.adultCount = self.personCount;
    }
    ;
    self.vDev.set("metrics:adultCount", self.adultCount);
    if (self.vDev.get("metrics:debug")) {
        self.controller.addNotification("info", "PersonIdentificationModule acountoffadult " + self.adultCount, "module", "PersonIdentificationModule");
    }
};

/**
 * puts an Measurepoint in an Measuredata
 * @param {MultiLevelSensor} CO2Device
 * @param {Object} measureData
 * @returns {measureData}
 */
PersonIdentificationModule.prototype.makeMeasurePoint = function (CO2Device, measureData) {
    measureData.xList.push((new Date().getTime() - measureData.startTime));
    measureData.yList.push(CO2Device.get("metrics:level"));
    measureData.counter++;
    return measureData;
};

/**
 * return the Y Value of an line function
 * @param {object} line
 * @param {double} x
 * @returns {double}
 */
PersonIdentificationModule.prototype.getRegressionLineValue = function (line, x) {
    return line.a * x + line.b;
};

/**
 * Method to calculate a regression Line out off Measurepoints through mkq
 * @param {object} measuredata
 * @param {object} line
 * @returns {line}
 */
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

/**
 * Makes an Persona Objekt out of Parameters
 * @param {string} name
 * @param {int} minVLM
 * @param {int} maxVLM
 * @param {int} ppmValue
 * @returns {persona}
 */
PersonIdentificationModule.prototype.makePersona = function (name, minVLM, maxVLM, ppmValue) {
    return persona = {
        kind: name,
        minPpm: minVLM * ppmValue,
        maxPpm: maxVLM * ppmValue
    };

};

/**
 * Makes an Persona out of an keyword and the ppmValue
 * @param {string} kind
 * @param {int} ppmValue
 * @returns {persona}
 */
PersonIdentificationModule.prototype.makePersonaByKind = function (kind, ppmValue) {
    switch (kind) {
        case "Man":
            return this.makePersona(kind, 10, 12, ppmValue);
        case "Woman":
            return this.makePersona(kind, 7, 9, ppmValue);
        case "Child":
            return this.makePersona(kind, 4, 6, ppmValue);
        case "Adult":
            return this.makePersona(kind, 7, 12, ppmValue);
    }

};

/**
 * Looks if the CO2 Consumption is high enough that there is an adult
 * @param {double} delta delta CO2 change
 * @param {object} personas persona array
 * @param {int} personCount
 * @param {int} roomVolume in Liter
 * @param {int} waitingMinutes
 * @returns {Boolean}
 */
PersonIdentificationModule.prototype.identify = function (delta, personas, personCount, roomVolume, waitingMinutes, adultCount) {
    //for this Modul undefined person Count Values

    var minDelta = 0;
    var childsMaxPpm = new Array();
    var cCount = 0;
    personas.forEach(function (each) {
        if (each.kind === "Child") {
            childsMaxPpm.push(each.maxPpm);
            cCount += 1;
        }
    });
    if (personCount - adultCount > cCount) {
        return false;
    }
    for (var count = 0; count < personCount; count++) {
        if (childsMaxPpm.length > 0) {
            minDelta += this.getPpmByRoomAndTime(this.popMaxOfAnIntegerArray(childsMaxPpm), roomVolume, waitingMinutes);
        }
    }
    ;
    if (this.vDev.get("metrics:debug")) {
        this.controller.addNotification("info", "identify" + delta + " u " + minDelta, "module", "PersonIdentificationModule");
    }
    if (delta < minDelta) {
        return false;
    } else {
        return true;
    }
};

/**
 * get the ppm level from a person constant ppm for a special roomvolume after a time
 * @param {double} ppmOfPerson
 * @param {int} roomVolume
 * @param {double} waitingMinutes
 * @returns {unresolved}
 */
PersonIdentificationModule.prototype.getPpmByRoomAndTime = function (ppmOfPerson, roomVolume, waitingMinutes) {
    return   (ppmOfPerson / roomVolume) * waitingMinutes;
};

/**
 * Searching an maxximum value of an integer array and pops it from array
 * @param {integer:array} array
 * @returns {PersonIdentificationModule.prototype.popMaxOfAnIntegerArray.array}
 */
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

/**
 * inits a Measurementdata object to an blank one
 * @param {object} measuredata to clean
 * @returns {measuredata}
 */
PersonIdentificationModule.prototype.initMeasureData = function (measuredata) {
    measuredata = {
        xList: new Array(),
        yList: new Array(),
        counter: 0,
        startTime: 0
    };
    return measuredata;
};

/**
 * Reads the value of an PersonCounter
 * @param {string} persoCounterId
 * @param {object} measureData
 * @returns {undefined}
 */
PersonIdentificationModule.prototype.readPersonCounter = function (persoCounterId, measureData) {
    var personCounterDevice = this.controller.devices.get(persoCounterId);
    this.personCount = personCounterDevice.get("metrics:level");
    this.initMeasureData(measureData);
    if (this.vDev.get("metrics:debug")) {
        this.controller.addNotification("info", "PersonIdentificationModule new pcouner: " + this.personCount, "module", "PersonIdentificationModule");
    }
};

/**
 * set the Status of the PersonIdentificationModule
 * @param {boolean} bool
 * @param {PersonIdentificationModule} self
 * @returns {undefined}
 */
PersonIdentificationModule.prototype.makeStatement = function (bool, self) {

    if (bool & self.adultCount > 0) {
        self.adultFound = true;
        self.vDev.set("metrics:level", "on");
        self.vDev.set("metrics:status", true);
        self.vDev.set("metrics:adultCount", self.adultCount);
        self.vDev.set("metrics:personCount", self.personCount);
        self.controller.devices.emit(self.eventID + '_adult_there');
    } else {
        self.adultFound = false;
        self.vDev.set("metrics:level", "off");
        self.vDev.set("metrics:status", false);
        self.vDev.set("metrics:adultCount", self.adultCount);
        self.vDev.set("metrics:personCount", self.personCount);
        self.controller.devices.emit(self.eventID + '_no_adult_there');

    }
    self.measuredata = self.initMeasureData(self.measuredata);
    if (self.vDev.get("metrics:debug")) {
        self.controller.addNotification("info", "PersonIdentificationModule make Statement: " + self.vDev.get("metrics:level"), "module", "PersonIdentificationModule");
    }
};

/**
 * Looks if there is an open door or Window Contact
 * @param {binarySwitch:array} doorContacts
 * @param {PersonIdentificationModule} self
 * @returns {Boolean}
 */
PersonIdentificationModule.prototype.lookAfterOpenDandW = function (doorContacts, self) {
    if (doorContacts === null) {
        return true;
    }
    doorContacts.forEach(
            function (each) {
                var eachBinarySwitch = this.controller.devices.get(each);
                if (eachBinarySwitch.get("metrics:level") === "off") {
                    self.makeStatement(false, self);
                    return false;
                }
            }
    );
    return true;
};
