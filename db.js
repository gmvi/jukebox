var fs = require('fs'),
    mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var settings = require('./settings');

var rooms;
var users;

var defaultCallback = function (err, result) {
  if (err) console.log(err);
}

MongoClient.connect(settings.databaseuri, function(err, database) {
  rooms = database.collection("rooms");
  if (settings.debug)
    rooms.remove({}, defaultCallback);
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
