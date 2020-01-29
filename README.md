# homebridge-blinds-http-state

`homebridge-blinds-http-state` is a plugin for Homebridge to control blinds/screen via http requests. It assumes that there is no response from endpoint and no information of the state of blinds/screen so it emulates them based on the time of movement of blinds/screen from config. That way if you change the position of blinds/screen during movement it still acts normally (for example stops closing and starts opening).
I baseded it on a `homebridge-blinds-cmd-zh`.

## Installation

If you are new to Homebridge, please first read the Homebridge [documentation](https://www.npmjs.com/package/homebridge).

Install homebridge:
```sh
sudo npm install -g homebridge
```
Install homebridge-blinds-http-state:
```sh
sudo npm install -g homebridge-blinds-http-state
```

## Configuration

Add the accessory in `config.json` in your home directory inside `.homebridge`.

```js
    {
      "accessory": "BlindsCMDZH",
      "name": "Window",
      "up_cmd": "http://example.com/?action=up",
      "down_cmd": "http://example.com/?action=down",
      "stop_cmd": "http://example.com/stop",
      "motion_time": "<time your blind needs to move from up to down (in milliseconds)>"
    }
```


Feel free to contribute to make this a better plugin!
