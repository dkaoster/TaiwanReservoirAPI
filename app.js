
// Node.js modules
const express = require('express');
const app = express();

// Library
const reservoir = require('./libs/reservoir');

// Get today
app.get('/', function(req, res) {
  reservoir({}, function (err, reservoirData) {
    if (err) return res.jsonp({err: err.toString()});
    return res.jsonp({data: reservoirData});
  });
});

// Get a specific day
app.get('/:year-:month-:day', function(req, res) {
  reservoir(req.params, function (err, reservoirData) {
    if (err) return res.jsonp({ err: err.toString() });
    return res.jsonp({data: reservoirData});
  });
});

app.set('port', process.env.PORT || 9090);

const server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
