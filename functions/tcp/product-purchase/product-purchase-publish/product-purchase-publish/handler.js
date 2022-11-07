'use strict';

module.exports = (event, context) => {

    context.headerValues = {
        'Content-Type': 'application/json'
    };

    console.log(event.body);

    if (event.body.gotPrice && event.body.approved) {
        const result = {
            productId: event.body.id,
            productPrice: event.body.price,
            userId: event.body.user,
            authorization: event.body.authorization
        };
        console.log(result);
        context
            .status(200)
            .succeed(JSON.stringify(result));

    } else {
        context
            .status(200)
            .fail(JSON.stringify({
                failureReason: event.body.failureReason ? event.body.failureReason : 'undefined error'
            }));
    }
};