function Responder(req, senderFn) {
  var sent = false;
  var data = {
    headers: {},
    status: 200,
  };
  if (req.thread) {
    data.thread = req.thread;
  }
  this.status = function(code) {
    data.status = code || 200;
    return this;
  };
  this.get = function(key) {
    return data.headers[key];
  };
  this.set = function(key, value) {
    data.headers[key] = value;
    return this;
  };
  this.send = function(body) {
    if (sent) throw new Error('can\'t send twice');
    sent = true;
    if (typeof body != undefined) {
      data.body = body;
    }
    senderFn(data);
  };
  this.sendStatus = function(code) {
    this.status(code)
        .send();
  };
  this.end = function() {
    this.send();
  };
};

module.exports = Responder;
