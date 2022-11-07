"use strict"

const request = require('request-promise');

const constants = {
    URL_PHOTO_RECEIVE: process.env.URL_PHOTO_RECEIVE,
    URL_PHOTO_SUCCESS: process.env.URL_PHOTO_SUCCESS,
    URL_PHOTO_REPORT: process.env.URL_PHOTO_REPORT
};

const functions = {
    // for normal json request
    getRequestObject: (requestVals, url) => {
        return {
            method: 'POST',
            uri: url,
            body: requestVals,
            json: true
        }
    },
    // for binary request
    getRequestObjectRaw: (requestVals, url, headers, query) => {
        return {
            method: 'POST',
            uri: url,
            body: requestVals,
            headers: headers,
            qs: query
        }
    }
}

const api = {
    acquirePhoto : (event, context) => {
        context.headerValues = {
            'Content-Type': 'application/json'
        };
        // STEP 01: Receive Photo
        console.log('REC REQ QUERY: %s', JSON.stringify(event.body));
        request(functions.getRequestObject(event.body, constants.URL_PHOTO_RECEIVE), constants.URL_PHOTO_RECEIVE)
            .then(recRes => {
                console.log('REC RES: %s', JSON.stringify(recRes));
                // STEP 02: Success
                request(functions.getRequestObject(recRes, constants.URL_PHOTO_SUCCESS), constants.URL_PHOTO_SUCCESS)
                    .then(sucRes => {
                        console.log('SUC RES: %s', JSON.stringify(sucRes));
                        // STEP 03: Report (Update DB)
                        request(functions.getRequestObject(sucRes, constants.URL_PHOTO_REPORT), constants.URL_PHOTO_REPORT)
                            .then(repRes => {
                                console.log('REP RES: %s', JSON.stringify(repRes));
                                context
                                    .status(200)
                                    .succeed(repRes);
                            })
                            .catch(ex => {
                                console.error(ex);
                                context
                                    .status(200)
                                    .fail(JSON.stringify({
                                        error: 'failed to report photo'
                                    }));
                            });

                    })
                    .catch(ex => {
                        console.error(ex);
                        context
                            .status(200)
                            .fail(JSON.stringify({
                                error: 'failed to succeed photo'
                            }));
                    });

            })
            .catch(ex => {
                console.error(ex);
                context
                    .status(200)
                    .fail(JSON.stringify({
                        error: 'failed to receive photo'
                    }));
            });
    }
}

module.exports = (event, context) => {
    api.acquirePhoto(event, context)
}
