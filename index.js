var request = require("request");
var Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-blinds-http-state", "BlindsHttpWithState", BlindsHttpWIthStateAccessory);
}

function BlindsHttpWIthStateAccessory(log, config) {
    // global vars
    this.log = log;

    // configuration vars
    this.name = config["name"];
    this.upURL = config["up_cmd"];
    this.downURL = config["down_cmd"];
    this.stopURL = config["stop_cmd"];
    this.motionTime = parseInt(config["motion_time"],10);
    this.forceStopOnChange = config["force_stop_on_change"];
    this.motionStep = this.motionTime/100;
    this.log("Motion time: %s", this.motionStep);

    //this.stopAtBoundaries = config["trigger_stop_at_boundaries"];

    // state vars
    this.interval = null;
    this.timeout = null;
    this.lastPosition = 100; // last known position of the blinds, up by default
    this.currentPositionState = 2; // stopped by default
    this.currentTargetPosition = 100; // up by default

    // register the service and provide the functions
    this.service = new Service.WindowCovering(this.name);

    // the current position (0-100%)
    // https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L493
    this.service
        .getCharacteristic(Characteristic.CurrentPosition)
        .on('get', this.getCurrentPosition.bind(this));

    // the position state
    // 0 = DECREASING; 1 = INCREASING; 2 = STOPPED;
    // https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L1138
    this.service
        .getCharacteristic(Characteristic.PositionState)
        .on('get', this.getPositionState.bind(this));

    // the target position (0-100%)
    // https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L1564
    this.service
        .getCharacteristic(Characteristic.TargetPosition)
        .on('get', this.getTargetPosition.bind(this))
        .on('set', this.setTargetPosition.bind(this));
}

BlindsHttpWIthStateAccessory.prototype.getCurrentPosition = function (callback) {
    this.log("Requested CurrentPosition: %s", this.lastPosition);
    callback(null, this.lastPosition);
}

BlindsHttpWIthStateAccessory.prototype.getPositionState = function (callback) {
    this.log("Requested PositionState: %s", this.currentPositionState);
    callback(null, this.currentPositionState);
}

BlindsHttpWIthStateAccessory.prototype.getTargetPosition = function (callback) {
    this.log("Requested TargetPosition: %s", this.currentTargetPosition);
    callback(null, this.currentTargetPosition);
}

BlindsHttpWIthStateAccessory.prototype.setTargetPosition = function (pos, callback) {
    this.log("Set TargetPosition: %s", pos);
    this.currentTargetPosition = pos;
    if (this.currentTargetPosition == this.lastPosition) {
        if (this.interval != null) clearInterval(this.interval);
        if (this.timeout != null) clearTimeout(this.timeout);
        this.log("Already here");
        callback(null);
        return;
    }
    const moveUp = (this.currentTargetPosition >= this.lastPosition);
    this.log((moveUp ? "Moving up" : "Moving down"));
    if ((moveUp && this.currentPositionState == 0) || (!moveUp && this.currentPositionState == 1)) {
        if (this.forceStopOnChange) {
            this.cmd(this.stop_cmd, (error) => {
                this.log("Stopped");
            });
        }
    }

    this.service
        .setCharacteristic(Characteristic.PositionState, (moveUp ? 1 : 0));

    this.log("Command to execute: %s", (moveUp ? this.upURL : this.downURL));
    this.cmd((moveUp ? this.upURL : this.downURL), function (error) {
        if (error == null) {
            this.log(
                "Success starting moving %s",
                (moveUp ? "up (to " + pos + ")" : "down (to " + pos + ")")
            );
        } else {
            this.log(
                "There was an error: %s", error
            );
        }
    }.bind(this));

    var localThis = this;
    if (this.interval != null) clearInterval(this.interval);
    if (this.timeout != null) clearTimeout(this.timeout);
    this.interval = setInterval(function () {
        localThis.lastPosition += (moveUp ? 1 : -1);
        localThis.service
            .setCharacteristic(Characteristic.CurrentPosition, localThis.lastPosition);
        localThis.log("Current position: %s", localThis.lastPosition);
        if (localThis.lastPosition == localThis.currentTargetPosition) {
            if (localThis.currentTargetPosition != 0 && localThis.currentTargetPosition != 100) {
                localThis.cmd(localThis.stopURL, function (error) {
                    if (error == null) {
                        localThis.log(
                            "Success stop moving %s",
                            (moveUp ? "up (to " + pos + ")" : "down (to " + pos + ")")
                        );
                    } else {
                        localThis.log(
                            "There was an error: %s", error
                        );
                    }
                    localThis.service
                        .setCharacteristic(Characteristic.PositionState, 2);
                    localThis.lastPosition = pos;
                }.bind(localThis));
            }
            clearInterval(localThis.interval);
        }
    }, this.motionStep);
    callback(null);
}

BlindsHttpWIthStateAccessory.prototype.cmd = function (comm, callback) {
    request({
        method: "POST",
        url: comm,
    }, function (err, response, body) {
        if (!err && response && response.statusCode == 200) {
            callback(null);
        } else {
            callback(`error: ${err.message}, body: ${body}`);
        }
    });
}

BlindsHttpWIthStateAccessory.prototype.getServices = function () {
    return [this.service];
}