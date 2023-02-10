const EventEmitter = require('events').EventEmitter;
const amqplib = require('amqplib');
const uuid = require('uuid');


class setuReceiverService extends EventEmitter {
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

            if (options.durable !== undefined) {
                await channel.assertQueue(`wait-${options.serviceName}`, {
                    durable: options.durable
                });
            } else {
                await channel.assertQueue(`wait-${options.serviceName}`);
            }

            if (options.prefetch !== undefined) {
                channel.prefetch(options.prefetch);
            }

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

            if (options.durable !== undefined) {
                await channel.assertQueue(options.serviceName, {
                    durable: options.durable
                });
            } else {
                await channel.assertQueue(options.serviceName);
            }

            if (options.prefetch !== undefined) {
                channel.prefetch(options.prefetch);
            }

            this.emit('connect', "connected");
            channel.consume(options.serviceName, async (data) => {
                this.emit('start', data.content.toString(), function (queueData = data) {
                    channel.ack(data);
                });
            });
        } catch (error) { 
            this.emit('error', error);
        }
    }
}

class setuSenderService {

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

    assertQueue(channel, options) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.channel.assertQueue(channel, options);
                resolve(this);
            } catch (error) {
                reject(error);
            }
        })
    }

    sendToQueue(channel, message, option) {
        return new Promise(async (resolve, reject) => {
            try {
                if (option && option.wait && option.wait == true) {
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

                    const sendToQueueOption = {
                        correlationId: correlationId,
                        replyTo: waitQueue.queue
                    };

                    if (option.persistent !== undefined) {
                        sendToQueueOption.persistent = option.persistent;
                    }

                    this.channel.sendToQueue(`wait-${channel}`, Buffer.from(message.toString()), sendToQueueOption);
                } else {
                    if (option && option.persistent !== undefined) {
                        this.channel.sendToQueue(channel, Buffer.from(message.toString()), {
                            persistent: option.persistent
                        });
                    } else {
                        this.channel.sendToQueue(channel, Buffer.from(message.toString()));
                    }
                    resolve('sent');
                }
            } catch (error) {
                reject(error)
            }
        })
    }
}
module.exports.setuReceiverService = setuReceiverService
module.exports.setuSenderService = setuSenderService
