"use strict"

const request = require('request-promise');

const constants = {
    URL_PHOTO_ASSIGN: process.env.URL_PHOTO_ASSIGN,
    URL_PHOTO_MESSAGE: process.env.URL_PHOTO_MESSAGE,
    URL_PHOTO_RECORD: process.env.URL_PHOTO_RECORD,
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
    requestPhoto : (event, context) => {
        context.headerValues = {
            'Content-Type': 'application/json'
        };
        // STEP 01: Assign Photographer
        console.log(constants.URL_PHOTO_ASSIGN);
        request(functions.getRequestObject(event.body, constants.URL_PHOTO_ASSIGN), constants.URL_PHOTO_ASSIGN)
            .then(res => {
                console.log('Assign result:');
                console.log(res);
                // Synthesize next requests
                res.data.photographers = res.photographers;
                res.data.photographer = res.photographer;
                res.data.assigned = res.assigned;
                res.data.assignmentComplete = res.assignmentComplete;
                res.data.merchantName = 'NU';
                res.data.photographer.name = 'Photographer ' + res.data.photographer.id;
                delete(res.photographers);
                delete(res.photographer);
                delete(res.assigned);
                delete(res.assignmentComplete);
                console.log('Message Request:');
                console.log(res);
                // STEP 02: Message Photographer
                request(functions.getRequestObject(res, constants.URL_PHOTO_MESSAGE), constants.URL_PHOTO_MESSAGE)
                    .then(messRes => {
                        console.log('Message Response:');
                        console.log(messRes);
                    })
                    .catch(ex => {
                        console.log(ex);
                        context
                            .status(200)
                            .fail(JSON.stringify({
                            error: 'Failed in photo-message'
                        }))
                    });
                res.data.tasks = {
                    taskToken: '20210327'
                };
                console.log('Record Request:');
                console.log(res);
                // STEP 03: Record Photographer
                request(functions.getRequestObject(res, constants.URL_PHOTO_RECORD), constants.URL_PHOTO_RECORD)
                    .then(recRes => {
                        console.log('Record Response:');
                        console.log(recRes);
                        context
                            .status(200)
                            .succeed(recRes);
                    })
                    .catch(ex => {
                        console.log(ex);
                        context
                            .status(200)
                            .fail(JSON.stringify({
                                error: 'Failed in photo-record'
                            }))
                    });
            })
            .catch(ex => {
                console.log(ex);
                context
                    .status(200)
                    .fail(JSON.stringify({
                        error: 'Failed in photo-assign'
                    }))
            });
    }
}

module.exports = (event, context) => {
    console.log('*******Function: photo-request*******')
    api.requestPhoto(event, context);
}
