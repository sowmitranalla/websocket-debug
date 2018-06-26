$(function () {

  var messages = $('#messages');
  var content = $('#content');

  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;

  // if browser doesn't support WebSocket, just show
  // some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>',
      { text: 'Sorry, but your browser doesn\'t support WebSocket.' }
    ));
    return;
  }

  // var connection = new WebSocket('ws://nalla-debug-alb-2121094606.us-east-2.elb.amazonaws.com/echo');
  // var connection = new WebSocket('ws://localhost:3000/echo');
  var connection = new WebSocket('ws://18.191.121.154/echo');
  connection.onopen = () => {
    // connection is opened and ready to use
    console.log('websocket connections sucessfully opened');
    connection.send(1);
    messages.append(`<li>1</li>`);
  };

  connection.onerror = (error) => {
    // an error occurred when sending/receiving data
    // just in there were some problems with connection...
    content.html($('<p>', {
      text: 'Sorry, but there\'s some problem with your '
        + 'connection or the server is down.'
    }));
  };

  connection.onmessage = (message) => {
    // try to decode json (I assume that each message
    // from server is json)
    message = parseInt(message.data);
    // avoid infinite loop
    if (message < 300) {
      setTimeout(() => {
        messages.append(`<li>${message}</li>`);
        console.log(`waiting after ${message}`)
        connection.send(message);
      }, 1000);
    }
  };

  setInterval(() => {
    if (connection.readyState !== 1) {
      console.log("connection error" + Date.now());
    }
  }, 3000);
});