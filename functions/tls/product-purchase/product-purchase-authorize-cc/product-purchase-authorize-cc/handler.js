'use strict';

const { KV_Store } = require('kv-store');

const constants = {
    TABLE_CC_NAME: process.env.TABLE_CC_NAME,
    HOST: process.env.HOST,
    USER: process.env.USER,
    PASS: process.env.PASS,
    DBNAME: process.env.DBNAME
};

module.exports = (event, context) => {

    context.headerValues = {
        'Content-Type': 'application/json'
    };

    const result = event.body;
    console.log(result);


    const kv = new KV_Store(constants.HOST, constants.USER,
        constants.PASS, constants.DBNAME, constants.TABLE_CC_NAME);

    return kv.init()
        .then(() => kv.get(event.body.user))
        .then(cc => kv.close().then(() => cc))
        .then((cc) => {
            cc = JSON.parse(cc);
            console.log(cc);
            console.log(cc.creditCard);
            console.log(event.body.creditCard);
            console.log(cc.creditCard === event.body.creditCard);
            if (cc) {
                if (cc.creditCard !== event.body.creditCard) { // Simulate failure in 1% of purchases (expected).
                    result.approved = false;
                    result.failureReason = 'Credit card authorization failed';
                } else {
                    result.approved = true;
                    result.authorization = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                }
            } else {
                result.approved = false;
                result.failureReason = 'No credit card supplied and no credit card stored in DB';
            }
            return result;
        })
        .then(res => {
            context
                .status(200)
                .succeed(res);
        })
        .catch(ex => {
            console.log(ex);
            context
                .status(200)
                .fail(JSON.stringify({
                    error: 'unexpected error'
                }));
        });

};
