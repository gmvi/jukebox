var crypto = require("crypto");

function generate_id()
{ return crypto.pseudoRandomBytes(4).toString('hex');
}

function Room(name, owner)
{ this.name = name;
  this.owner = owner;
  if (name in Room.by_name)
    throw new Error("a room by that name already exists");
  Room.by_name[name] = this;
  Room.by_owner[owner] = this;
  this.songs = [];
}
Room.by_name = {};
Room.by_owner = {};

/** functions **/
module.exports = {};

function GetRoomByName(name)
{ var room = Room.by_name[name];
  if (room) return room;
  else throw new Error("room not found");
}

module.exports.RoomExists
    = function RoomExists(name)
{ var room = Room.by_name[name];
  return room != undefined;
}

module.exports.GetOwnerByRoomName
    = function GetOwnerByRoomName(name)
{ return GetRoomByName(name).owner;
}

module.exports.GetRoomNameByOwner
    = function GetRoomNameByOwner(owner)
{ var room = Room.by_owner[owner];
  if (room) return room.name;
  else throw new Error("room not found");
}

module.exports.CreateRoom
    = function CreateRoom(name, owner)
{ new Room(name, owner);
}

module.exports.CloseRoom
    = function CloseRoom(name)
{ var room = GetRoomByName(name);
  delete Room.by_name[name];
  delete Room.by_owner[room.owner];
}

module.exports.GetRooms
    = function GetRooms(n)
{ if (n == undefined)
    return Object.keys(Room.by_name);
  else
    return Object.keys(Room.by_name).slice(0, n);
}

module.exports.GetSongs
    = function GetSongs(room)
{ return GetRoomByName(room).songs;
}

module.exports.AddSong
    = function AddSong(room, peer)
{ var room = GetRoomByName(room);
  var id = generate_id();
  var song = "ul://"+peer+"/"+id;
  room.songs.push(song);
  return id;
}

module.exports.GetPeer 
    = function GetPeer(room)
{ return GetRoomByName(room).peer;
}

module.exports.SetPeer 
    = function SetPeer(room, peer)
{ GetRoomByName(room).peer = peer;
}