// setting varibles in the global scope so i can change them when aws spins up new instances
let ip1 = "18.216.194.22:3000";
let ip2 = "18.191.175.226:3000";
let ip3 = "18.191.4.58:3000";

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

  let connection = new WebSocket('ws://backend-svc-alb-2099270242.us-east-2.elb.amazonaws.com/echo');
  // var connection = new WebSocket('ws://localhost:3000/echo');
  // var connection = new WebSocket('ws://18.219.182.198/echo');

  const openConnection = () => {
    // connection is opened and ready to use
    console.log('websocket connections sucessfully opened');
    connection.send(1);
    messages.append(`<li>1</li>`);
  }

  const errorConnection = (error) => {
    // an error occurred when sending/receiving data
    // just in there were some problems with connection...
    content.html($('<p>', {
      text: 'Sorry, but there\'s some problem with your '
        + 'connection or the server is down.'
    }));
  }

  const messageConnection = (message) => {
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
  }
  connection.onopen = openConnection;

  connection.onerror = (error) => {
    errorConnection(error)
  };

  connection.onmessage = (message) => {
    messageConnection(message);
  };

  setInterval(() => {
    if (connection.readyState !== 1) {
      console.log("connection error" + Date.now());
      connection = new WebSocket('ws://backend-svc-alb-2099270242.us-east-2.elb.amazonaws.com/echo');
      // connection = new WebSocket('ws://localhost:3000/echo');
      connection.onopen = openConnection;
      connection.onerror = (error) => {
        errorConnection(error)
      };
      connection.onmessage = (message) => {
        messageConnection(message);
      };
    }
  }, 3000);

  const formatRow = (i1, i2, i3) => {
    return `<tr><td>${i1}</td><td>${i2}</td><td>${i3}</td></tr>`
  }

  setInterval(() => {

    let temp = []

    const promises = []

    promises.push(get(`http://${ip1}/healthcheck`))
    promises.push(get(`http://${ip2}/healthcheck`))
    promises.push(get(`http://${ip3}/healthcheck`))
    

    Promise.all(
      [promises[0].catch(e => e),
      promises[1].catch(e => e),
      promises[2].catch(e => e)])
      .then(resp => {
        console.log(resp)
        resp.forEach(r => {
          if(r.status !== 200){
            temp.push("Failed")
          } else {
            temp.push("Ok")
          }
        })
        $('#status tr:last').after(formatRow(temp[0], temp[1], temp[2]));
      }).catch(err => {
        console.log(err)
      })



  }, 3000)

  function get(url) {
    // Return a new promise.
    return new Promise(function (resolve, reject) {
      // Do the usual XHR stuff
      var req = new XMLHttpRequest();
      req.open('GET', url);

      req.onload = function () {
        // This is called even on 404 etc
        // so check the status
        if (req.status == 200) {
          // Resolve the promise with the response text
          resolve(req);
        }
        else {
          // Otherwise reject with the status text
          // which will hopefully be a meaningful error
          reject(Error(req));
        }
      };

      // Handle network errors
      req.onerror = function () {
        reject(Error("Network Error"));
      };

      // Make the request
      req.send();
    });
  }


});