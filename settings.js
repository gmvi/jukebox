var fs = require("fs");
if (fs.existsSync(__dirname + "/settings.json"))
{ module.exports = require("./settings.json");
}
else
{ module.exports = require("./settings-default.json");
}