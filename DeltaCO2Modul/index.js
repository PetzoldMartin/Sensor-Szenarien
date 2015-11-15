function DeltaCO2Modul (id, controller) {
 DeltaCO2Modul.super_.call(this, id, controller);
 }

 inherits(DeltaCO2Modul, AutomationModule);
 _module = DeltaCO2Modul;

DeltaCO2Modul.prototype.init = function (config) {
DeltaCO2Modul.super_.prototype.init.call(this, config);
    var self = this;


 // here you can
 // - initialize listeners,
 // - create a virtual device (for visualization on the web
//→ interface)
 // - process settings
 };

 DeltaCO2Modul.prototype.stop = function () {
 // here you should remove all registred listeners

 this.controller.devices.remove("DeltaC02Modul_" + this.id);
 DeltaCO2Modul.super_.prototype.stop.call(this);
 };

 // here you can add your own functions ...



