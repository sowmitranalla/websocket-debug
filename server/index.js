const express = require('express');
const cors = require('cors');
const lawgs = require('lawgs');
const crypto = require('crypto');

const app = express()
app.use(cors());
const WebSocket = require('express-ws')(app);

// sets up logging 
var startTime = new Date().toISOString();
var date = new Date().toISOString().split('T')[0];
lawgs.config({ aws: { region: 'us-east-2' } })
const logger = lawgs.getOrCreate('express-websocket');
const streamName = 'express-server-' + date + '-' +
  crypto.createHash('md5')
    .update(startTime)
    .digest('hex');


app.get("/", (req, res) => {
  logger.log(streamName, {
    message: `root path accessed from ${req.hostname}. response will be 200`,
    headers: req.headers
  });
  res.send("hello world");
});

app.get("/healthcheck", (req, res) => {
  logger.log(streamName, {
    message: `healthcheck accessed from ${req.hostname}. response will be 200`,
    headers: req.headers
  });
  res.sendStatus(200);
});

app.ws('/echo', function (ws, req) {
  ws.on('message', function (msg) {
    console.log(`websocket message @ ${Date.now()} : ${msg}`);
    num = parseInt(msg);
    num++
    ws.send(num);
  });
});

app.listen(3000, () => {
  logger.log(streamName, "Server running on port 3000");
  console.log("Server running on port 3000");
});