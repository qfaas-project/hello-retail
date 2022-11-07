"use strict"
const { KV_Store }  = require('kv-store');
const fs = require('fs');

const constants = {
    DBNAME: process.env.DBNAME,
    TABLE_PHOTOGRAPHER_NAME: process.env.TABLE_PHOTOGRAPHER_NAME,
    HOST: process.env.HOST,
    USER: process.env.USER,
    PASS: process.env.PASS
};

const impl = {
    putPhotographer: (event, complete) => {
        // event = event.body;
        // console.log('event: ' + event);
        const kv = new KV_Store(constants.HOST, constants.USER, constants.PASS,
            constants.DBNAME, constants.TABLE_PHOTOGRAPHER_NAME );

        const updated = Date.now();

        kv.init()
            .then(() => kv.put(
            event.body.data.photographer.id,
            JSON.stringify({
                updated,
                updatedBy: event.body.origin,
                phone: event.body.data.photographer.phone,
                assignments: 0,
                registrations: event.body.data.photographer.registrations
            })))
            .then(() => kv.close())
            .then(complete)
            .catch(err => complete(err));
    }
}

const api = {
    handleInput: (event, context, callback) => {
        impl.putPhotographer(event, callback);
    }
}

module.exports =  api.handleInput;
