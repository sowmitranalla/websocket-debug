const express = require('express');
const cors = require('cors');
const lawgs = require('lawgs');
const crypto = require('crypto');
const AWS = require('aws-sdk')

if (typeof Promise === 'undefined') {
  AWS.config.setPromisesDependency(require('bluebird'));
}

const meta = new AWS.MetadataService();

const app = express()
app.use(cors());
const WebSocket = require('express-ws')(app);

let iid = 'localhost';

// sets up logging 
let startTime = new Date().toISOString();
let date = new Date().toISOString().split('T')[0];
let streamName = "express-server" + date + '-' +
  crypto.createHash('md5')
    .update(startTime)
    .digest('hex');
lawgs.config({ aws: { region: 'us-east-2' } })


const logger = process.env.NODE_ENV === "production" ? lawgs.getOrCreate('express-websocket'): '';

if (process.env.NODE_ENV === "production") {
  meta.request("/latest/meta-data/instance-id", (err, data) => {
    if (err) {
      console.log(err);
    }
    iid = data;
    console.log(iid);
  });
}


app.get("/", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    logger.log(streamName, {
      message: `root path accessed from ${req.hostname}. response will be 200`,
      headers: req.headers,
      instance: iid
    });
  }
  res.send("hello world");
});

app.get("/healthcheck", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    logger.log(streamName, {
      message: `healthcheck accessed from ${req.hostname}. response will be 200`,
      headers: req.headers,
      instance: iid
    });
  }
  res.sendStatus(200);
});

app.ws('/echo', (ws, req) => {
  ws.on('message', (msg) => {
    console.log(`websocket message @ ${Date.now()} : ${msg}`);
    num = parseInt(msg);
    num++
    ws.send(num);
  });
});

app.listen(3000, () => {
  if (process.env.NODE_ENV === "production") {
    logger.log(streamName, "Server running on port 3000");
  }
  console.log("Server running on port 3000");
});
