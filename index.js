const EventEmitter = require('events').EventEmitter;
const amqplib = require('amqplib');
const uuid = require('uuid');


class shiveReceiverService extends EventEmitter {
    constructor(options) {
        super();
        //check for release mode
        if (options.wait == true) {
            //if release mode is enable in this case sender service will wait
            this._waitConnection(options)
        } else {
            //if release mode is disable in this case sender service will not wait
            this._simpleConnection(options)
        }
    }
    
    async _waitConnection(options) {
        try {
            const rabbitConn = await amqplib.connect(options.uri);
            let channel = await rabbitConn.createChannel();

            await channel.assertQueue(`wait-${options.serviceName}`,{
                durable: false
            });

            channel.prefetch(1);
            
            this.emit('connect', "connected");
            channel.consume(`wait-${options.serviceName}`, async (data) => {

                this.emit('start', data.content.toString(), function (responseData = '', queueData = data) {                     
                    channel.sendToQueue(queueData.properties.replyTo, Buffer.from(responseData.toString()), {
                        correlationId: queueData.properties.correlationId
                    });
                    channel.ack(queueData);
                });
            });
        } catch (error) { 
            this.emit('error', error);
        }
    }

    async _simpleConnection(options) {
        try {
            const rabbitConn = await amqplib.connect(options.uri);
            let channel = await rabbitConn.createChannel();

            await channel.assertQueue(options.serviceName);
            
            this.emit('connect', "connected");
            channel.consume(options.serviceName, async (data) => {
                this.emit('start', data.content.toString(), function (queueData=data) { 
                    channel.ack(queueData);
                });
            });
        } catch (error) { 
            this.emit('error', error);
        }
    }
}

class shiveSenderService {

    connect(options) {
        return new Promise(async (resolve, reject) => { 
            try {
                const rabbitConn = await amqplib.connect(options.uri);
                this.channel = await rabbitConn.createChannel();
                resolve(this);
            } catch (error) { 
                reject(error);
            }
        })
    }

    sendToQueue(channel, message, option = {wait: false}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (option.wait && option.wait == true) {
                    let waitQueue = await this.channel.assertQueue('', {
                        durable: false
                    });
                    
                    let correlationId = uuid.v4();
                    this.channel.consume(waitQueue.queue, function (msg) {
                        if (msg.properties.correlationId == correlationId) {
                            return resolve(msg.content.toString())
                        }
                    }, {
                        noAck: true
                    });
                    
                    this.channel.sendToQueue(`wait-${channel}`, Buffer.from(message.toString()), {
                        correlationId: correlationId,
                        replyTo: waitQueue.queue
                    });
                } else {
                    this.channel.sendToQueue(channel, Buffer.from(message.toString()));
                    resolve('sent');
                }
            } catch (error) {
                reject(error)
            }
        })
    }
}
module.exports.shiveReceiverService = shiveReceiverService
module.exports.shiveSenderService = shiveSenderService