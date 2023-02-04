# Welcome to Micro Setu

**Micro Setu** is light weight micro service freamwork, this freamwork is based on [RabbitMQ](https://www.rabbitmq.com)


# Install

    npm i micro-setu

## Client

    let { setuSenderService } = require('micro-setu');
    (async () => {   
	    let  sender = new  setuSenderService();
	    let  connection = await  sender.connect({
		    uri:  "<rabbitMQ-connection-uri>"
	    });
	    
	    await connection.assertQueue('<service-name>', { durable: <boolean> });
    
	    //this will send data to service
	    connection.sendToQueue('<service-name>', '<string-content>',{ persistent: <boolean> }).then(data  => {
		    console.log(data);
	    });
    
	    //this will send data to service and wait for response from service as wait option is enable
	    connection.sendToQueue('<service-name>', '<string-content>', { wait:  true, persistent: <boolean> }).then(data  => { 
		    console.log(data);
	    });
    })();

## sendToQueue

    #sendToQueue(service, content, [options])

 - service: Here we need to pass service name, this service should be up and running.
 - content: Here we need to pass **string** content, which will receive at service side.
 - option
    - wait: default value of wait is false, if we set this to true in this case client will wait for service's response but in service while creating connection object if wait is true.
    - persistent: this option is optional.

## Service

    let { setuReceiverService } = require('micro-setu');
    
    let receiver = new setuReceiverService({
        uri: "<rabbitMQ-connection-uri>",
        serviceName: 'my-queue-service',
	durable: <boolean>,
        prefetch: <digit>,
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
        ack(a + b); //you need to pass data in string format only, if wait is true
      }, 2000);
    
    });
