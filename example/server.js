let { shiveReceiverService } = require('../index');

let receiver = new shiveReceiverService({
    uri: "<rabbitMQ-connection-uri>",
    serviceName: 'my-queue-service',
    wait: true //if you want to wait client pass this as true else pass false
})

//when service connected to rabbitmq
receiver.on('connect', function (data) {
  console.log(data);
});

//when any error come in connection
receiver.on('error', function (error) {
  console.log(error);
});

//When you receive new data in service
receiver.on('start', function (data, ack) {
  console.log('received', data);
  let a = 5;
  let b = 10;
  
  setTimeout(function () {
    //if wait option is true in this case you can pass data and it will receive at client side
    //if wait option is false in this case it will acknowledge
    ack(a + b); //you need to pass data in string format only
  }, 2000);

});