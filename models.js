var mongoose = require('mongoose');

var roomSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  host: { type: mongoose.Schema.ObjectId, ref: 'User' }
});

var Room = exports.Room = mongoose.model('Room', roomSchema);

var userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  displayname: String,
  peerid: String
});

var User = exports.User = mongoose.model('User', userSchema);

([
  { username: 'a', displayname: 'Test User A' },
  { username: 'b', displayname: 'Test User B' },
  { username: 'c', displayname: 'Test User C' },
  { username: 'd', displayname: 'Test User D' }
]).forEach(function(item) {
  User.findOne({username:item.username}, function(err, room) {
    if (err) throw err;
    else if (!room) {
      (new User(item)).save(function(err) { if (err) throw err; });
    }
  });
});
