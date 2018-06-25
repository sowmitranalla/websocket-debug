const express = require('express');

const app = express()
const WebSocket = require('express-ws')(app);


app.get("/", (req, res) => {
  res.send("hello world");
});

app.get("/healthcheck", (req, res) => {
  res.sendStatus(200);
});

app.ws('/echo', function(ws, req) {
  ws.on('message', function(msg) {
    console.log(`accepted websocket message: ${msg}`);
    num = parseInt(msg);
    num++
    ws.send(num);
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});