global.config = {
  db: process.argv[2],
};
require('./models').initialize(function() {
  process.exit(0);
});


