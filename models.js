var mongoose = require('mongoose');

var roomSchema = new mongoose.Schema(
  { name: String,
    host: String
  });

var Room = exports.Room = mongoose.model('Room', roomSchema);
