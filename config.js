var fs = require("fs");
if (fs.existsSync(__dirname + "/config.json"))
{ module.exports = require("./config.json");
}
else
{ console.warn("using default config file");
  module.exports = require("./config-default.json");
}