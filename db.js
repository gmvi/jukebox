function Room(name, owner)
{ ROOM_AVAILABLE = 0;
  //ROOM_HELD = 1;
  ROOM_OCCUPIED = 2;

  this.name = name;
  this.status = owner ? ROOM_OCCUPIED : ROOM_AVAILABLE;
  this.owner = owner ? owner : "";
  if (owner) Room.rooms[name] = true;
  this.songs = [];

  this.check = function check()
  { if (this.status == ROOM_AVAILABLE)
      return "";
    else if (this.status == ROOM_OCCUPIED)
      return this.owner;
  }
  this.create = function create(client)
  { if (this.check() == "")
    { this.status = ROOM_OCCUPIED;
      this.owner = client;
      this.songs = [];
      Room.rooms[this.name] = true;
      return true;
    }
    else
      return false;
  }
  this.close = function close()
  { this.status = ROOM_AVAILABLE;
    delete Room.rooms[this.name];
  }
  this.addSong = function addSong(info)
  { this.songs.push(new Song(this.name, info));
  }
}
Room.rooms = {};

function Song(room, name)
{ this.room = room;
  this.name = name;
}

var rooms = { };

/** functions **/
module.exports = {};

function GetRoom(name)
{ if (!(name in rooms))
    rooms[name] = new Room(name);
  return rooms[name];
}

module.exports.CheckRoom = function CheckRoom(name)
{ return GetRoom(name).check();
}

module.exports.CreateRoom = function CreateRoom(name, peerid)
{ return GetRoom(name).create(peerid);
}

module.exports.CloseRoom = function CloseRoom(name)
{ return GetRoom(name).close();
}

module.exports.GetRooms = function GetRooms()
{ return Object.keys(Room.rooms);
}

module.exports.GetSongs = function GetSongs(name)
{ return GetRoom(name).songs;
}

module.exports.GetPeer = function GetPeer(name)
{ return GetRoom(name).peer;
}

module.exports.SetPeer = function SetPeer(name, peer)
{ GetRoom(name).peer = peer;
}