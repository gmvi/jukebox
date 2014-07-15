var fs = require('fs');
var mongo = require('mongodb');
var MongoClient  = mongo.MongoClient;

var settings;
if (fs.existsSync(__dirname + "/settings.json"))
{ settings = require("./settings.json");
}
else
{ settings = require("./settings-default.json");
}

var database;
var rooms;
var users;

MongoClient.connect(settings.databaseuri, function(err, database) {
  database = database;
  rooms = database.collection("rooms");
  users = database.collection("users");
});

module.exports = new (function Controller() {

var GetRoomByName = this.GetRoomByName = function GetRoomByName(name, cb)
{ rooms.findOne({name: name}, cb);
}

this.RoomExists = function RoomExists(name, cb)
{ GetRoomByName(name, function (err, res)
  { if (err) cb(err);
    else cb(null, Boolean(res));
  });
}

this.GetHostByRoomName = function GetHostByRoomName(name, cb)
{ GetRoomByName(name, function (err, res)
  { if (err) cb(err);
    else if (res) cb(null, res.host);
    else cb(null, null);
  });
}

this.GetRoomNameByHost = function GetRoomNameByHost(host, cb)
{ rooms.findOne({host: host}, function (err, res)
  { if (err) cb(err);
    else if (res) cb(null, res.name);
    else cb(null, null);
  });
}

var defaultCallback = function (err, result) {
  if (err) console.log(err);
}

// create room on existant room is an error
this.CreateRoom = function CreateRoom(name, host, cb)
{ var roomdoc = { name  : name,
                  host  : host };
  rooms.insert(roomdoc, cb || defaultCallback);
}

this.CloseRoom = function CloseRoom(name, cb)
{ rooms.remove({name: name}, cb || defaultCallback);
}

// This should really wait for database to be set before returning
// Fibrous?

})();
