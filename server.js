var express = require('express');
var uuid = require('node-uuid');
var app = express();
var WebSocketServer = require('ws').Server;
var zmq = require('zmq');


app.use('/', express.static('www'));
var server = require('http').createServer(app);


console.log('start the messagebusd with: ./messagebusd tcp://127.0.0.1:5000 tcp://127.0.0.1:5001 tcp://127.0.0.1:5002');

server.listen(3000, function() {
  console.log('listening for websocket connections on port '+ server.address().port);
});


var ws = new WebSocketServer({server: server, handleProtocols: "zmqws-protocol"});

ws.on('connection', function(connection) {
  var dealer = zmq.socket('dealer');
  dealer.connect('tcp://127.0.0.1:5001');

  // append something randomish to the address
  var address = connection.upgradeReq.url.substring(1);
  var subAddress = address+ '_' + uuid.v4();

  var sub = zmq.socket('sub');
  sub.connect('tcp://127.0.0.1:5002');
  sub.subscribe(address);

  sub.on('message', function(to, from, timestamp, message) {
    to = to.toString();
    from = from.toString();
    timestamp = timestamp.toString();
    message = message.toString();
    try {
      var json = JSON.parse(message);
      connection.send(JSON.stringify(
        {
    	    messageEvent: {
    		to: to,
    		from: from,
    		timestamp: timestamp,
    		message: json
    	    }
        }
      ));
    } catch (error) {
      console.log(error);
    }
  });

  connection.on('message', function(message) {
    try {
      var msg = JSON.parse(message);
      if (msg && msg.messageRequest) {
        dealer.send([msg.messageRequest.to, subAddress, Date.now(), JSON.stringify(msg.messageRequest.message)]);
      }
    } catch (error) {
      console.log(error);
    }
  });

  connection.on('close', function() {
    dealer.close();
    sub.close();
  });
});
