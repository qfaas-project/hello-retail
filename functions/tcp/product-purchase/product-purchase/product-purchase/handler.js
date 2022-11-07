"use strict"

const request = require('request-promise');

const constants = {
    URL_PRODUCT_PURCHASE_GET_PRICE: process.env.URL_PRODUCT_PURCHASE_GET_PRICE,
    URL_PRODUCT_PURCHASE_AUTHORIZE_CC: process.env.URL_PRODUCT_PURCHASE_AUTHORIZE_CC,
    URL_PRODUCT_PURCHASE_PUBLISH: process.env.URL_PRODUCT_PURCHASE_PUBLISH,
};

const functions = {
    getRequestObject: (requestVals, url) => {
        return {
            method: 'POST',
            uri: url,
            body: requestVals,
            json: true
        }
    }
}

const api = {
    purchase: (event, context) => {
        context.headerValues = {
            'Content-Type': 'application/json'
        };
        // STEP 01: Get Price
        console.log('GET PRICE REQ:');
        console.log(event.body);
        request(functions.getRequestObject(event.body, constants.URL_PRODUCT_PURCHASE_GET_PRICE), constants.URL_PRODUCT_PURCHASE_GET_PRICE)
            .then(priceRes => {
                console.log('GET PRICE RES:');
                console.log(priceRes);
                // STEP 02: Authorize Credit Card
                request(functions.getRequestObject(priceRes, constants.URL_PRODUCT_PURCHASE_AUTHORIZE_CC), constants.URL_PRODUCT_PURCHASE_AUTHORIZE_CC)
                    .then(ccRes => {
                        console.log('AUTH CC RES:');
                        console.log(ccRes);
                        // STEP 03: Publish
                        request(functions.getRequestObject(ccRes, constants.URL_PRODUCT_PURCHASE_PUBLISH), constants.URL_PRODUCT_PURCHASE_PUBLISH)
                            .then(pubRes => {
                                console.log('PUB RES:');
                                console.log(pubRes);
                                context
                                    .status(200)
                                    .succeed(JSON.stringify(pubRes));
                            })
                            .catch(ex => {
                                console.log(ex);
                                context
                                    .status(200)
                                    .fail(JSON.stringify({
                                        error: 'failed to publish'
                                    }));
                            });
                    })
                    .catch(ex => {
                        console.log(ex);
                        context
                            .status(200)
                            .fail(JSON.stringify({
                                error: 'failed to authorize credit card'
                            }));
                    });
            })
            .catch(ex => {
                console.log(ex);
                context
                    .status(200)
                    .fail(JSON.stringify({
                        error: 'failed to get price'
                    }));
            });
    }
};

module.exports = (event, context) => {
    api.purchase(event, context);
}
