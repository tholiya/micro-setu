let { shiveSenderService } = require('../index');
(async () => {
    let sender = new shiveSenderService();
    let connection = await sender.connect({
        uri: "<rabbitMQ-connection-uri>"
    });

  //this will send data to service
    connection.sendToQueue('<service-name>', '<string-content>').then(data => { 
        console.log(data);
    });
  //this will send data to service and wait for response from service as wait option is enable
    connection.sendToQueue('<service-name>', '<string-content>', { wait: true }).then(data => { 
        console.log(data);
    });

})();