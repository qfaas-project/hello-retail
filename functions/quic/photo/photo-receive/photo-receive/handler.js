"use strict"

// This function receives a binary file in HTTP.Body
// And receive parameters in URL
// e.g. http://127.0.0.1:31112/function/photo-receive?photographer=1&taskToken=20210324
// Verify the taskToken and insert binary data into DB

const { KV_Store } = require('kv-store');
const BbPromise = require('bluebird');

const constants = {
    TABLE_STORED_PHOTOS_NAME: process.env.TABLE_STORED_PHOTOS_NAME,
    // IMAGE_BUCKET: process.env.IMAGE_BUCKET,
    TABLE_PHOTO_ASSIGNMENTS_NAME: process.env.TABLE_PHOTO_ASSIGNMENTS_NAME,
    HOST: process.env.HOST,
    USER: process.env.USER,
    PASS: process.env.PASS,
    DBNAME: process.env.DBNAME
};

const impl = {
    /**
     * The request doesn't contain any of the original product creation event that caused the assignment.  Obtain the
     * assignment associated with the number that this message/image is being received from.
     * @param results The event representing the HTTPS request
     */
    getAssignment: (photographer) => {

        console.log('******** get assignment *********');

        const kv = new KV_Store(constants.HOST, constants.USER,
            constants.PASS, constants.DBNAME, constants.TABLE_PHOTO_ASSIGNMENTS_NAME);
        // TODO KALEV - Make sure to correctly invoke the callback in case of error (see above).
        return kv.init()
            .then(() => kv.get(photographer))
            .then(res => kv.close().then(() => res))
            .then((res) => {
                const parsedRes = JSON.parse(res);
                parsedRes.id = photographer;
                return parsedRes;
            })
            .catch(err => BbPromise.reject(err));
    },

    // STore a url of the photo
    storePhoto: (res, data)  => {
        console.log('******** store photo *********');
        const photoKV = new KV_Store(constants.HOST, constants.USER,
            constants.PASS, constants.DBNAME, constants.TABLE_STORED_PHOTOS_NAME);
        photoKV.init()
            .then(()=> photoKV.put(
                res.taskEvent, // taskEvent = product.id
                data.url
            ))
            .then(() => photoKV.close())
            .then(() => {
                    return res;

                }
            )
            .catch(err => BbPromise.reject(err));

    }
}

module.exports = (event, context) => {

    const tRespStart = Date.now();

    console.log('PATH: %s', event.path);
    console.log('HEADERS: %s', event.headers);
    console.log('PARAMS: %s', JSON.stringify(event.query));
    // const assignment  = event.path.replace(/^\/|\/$/g, '')
    //

    const data = event.body
    const params = {
        photographer: data.photographer,
        taskToken: data.taskToken,
    }
    context.headerValues = {
        'Content-Type': 'application/json'
    };

    impl.getAssignment(params.photographer)
        .then((res) => {
            const result = {
                photographer: data.photographer,
                taskToken: data.taskToken,
                url: data.url,
                received: false
            };
            if(res.taskToken == params.taskToken) {
                const tDBStart = Date.now();
                impl.storePhoto(res, data);
                const tEnd = Date.now();
                result.dbElapse = tEnd - tDBStart;
                result.respElapse = tEnd - tRespStart;
                result.assignment = res;
                result.received = true;
            }
            context
                .status(200)
                .succeed(JSON.stringify(result));
        })
        .catch(ex => {
            console.log(ex);
            context.status(200).fail(JSON.stringify({
                error: 'failed to receive'
            }));
        });
}
