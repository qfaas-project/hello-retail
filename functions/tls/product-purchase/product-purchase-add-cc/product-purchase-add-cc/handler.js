"use strict"
const { KV_Store }  = require('kv-store');

const constants = {
    DBNAME: process.env.DBNAME,
    TABLE_CC_NAME: process.env.TABLE_CC_NAME,
    HOST: process.env.HOST,
    USER: process.env.USER,
    PASS: process.env.PASS
};

const impl = {
    addCC: (event, complete) => {
        // event = event.body;
        // console.log('event: ' + event);
        const kv = new KV_Store(constants.HOST, constants.USER, constants.PASS,
            constants.DBNAME, constants.TABLE_CC_NAME );

        const updated = Date.now();

        kv.init()
            .then(() => kv.put(
            event.body.user,
            JSON.stringify({
                updated,
                creditCard: event.body.creditCard
            })))
            .then(() => kv.close())
            .then(complete)
            .catch(err => complete(err));
    }
}

const api = {
    handleInput: (event, context, callback) => {
        impl.addCC(event, callback);
    }
}

module.exports =  api.handleInput;
