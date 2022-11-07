'use strict';

const Promise = require('bluebird');

Promise.config({
    longStackTraces: true,
});

const { KV_Store } = require('kv-store');
const fs = require('fs');

/**
 * acquire photo states:
 *  executing assignment
 *  awaiting photo (paused)
 *  awaiting photographer (paused)
 * cases:
 *  no photographers registered/with remaining assignments.
 *  no photographers available.
 *  photographer available.
 *
 *  no pending photos
 *  photos pending
 */

const constants = {
    ERROR_SERVER: 'ServerError',
    // resources
    TABLE_PHOTOGRAPHER_NAME: process.env.TABLE_PHOTOGRAPHER_NAME,
    HOST: process.env.HOST,
    USER: process.env.USER,
    PASS: process.env.PASS,
    DBNAME: process.env.DBNAME
};

/**
 * Errors
 */
class ServerError extends Error {
    constructor(message) {
        super(message);
        this.name = constants.ERROR_SERVER
    }
}

const impl = {

    queryAndAssignPhotographersByAssignmentCount: Promise.coroutine(function* qP(event, assignmentCount/* , priorData */) {

        let kv = new KV_Store(constants.HOST, constants.USER,
            constants.PASS, constants.DBNAME, constants.TABLE_PHOTOGRAPHER_NAME);

        const data = yield kv.init()
            .then(() => kv.entries())
            .then(results => results.filter(res => JSON.parse(res.val).assignments === assignmentCount).map((res) => {
                const jval = JSON.parse(res.val);
                jval.id = res.key;
                console.log(`%%%% res.val is: ${res.val}`);
                console.log(`%%%% jval is: ${JSON.stringify(jval, null, 2)}`);
                return jval;
            }))
            .then(res => kv.close().then(() => res))
            .catch();

        console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
        console.log(data);
        console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');

        if (data && Array.isArray(data) && data.length) { // given a non-empty set of photographers, attempt assignment on the seemingly available ones
            for (let i = 0; i < data.length; i++) {
                const item = data[i];

                if ( // is the current photographer assignable?
                    !item.assignment && // not assigned
                    'assignments' in item && Number.isInteger(item.assignments) && // valid assignments attribute
                    'registrations' in item && Number.isInteger(item.registrations) && // valid registrations attribute
                    item.assignments < item.registrations // fewer successful assignments than registrations
                ) {
                    kv = new KV_Store(constants.HOST, constants.USER,
                        constants.PASS, constants.DBNAME, constants.TABLE_PHOTOGRAPHER_NAME);
                    const updated = Date.now();

                    const itemClone = JSON.parse(JSON.stringify(item));
                    delete itemClone.id;
                    itemClone.updated = updated;
                    itemClone.updatedBy = event.origin;
                    itemClone.assignment = event.data.id.toString();

                    const updateData = yield kv.init()
                        .then(() => kv.put(  // eslint-disable-line no-loop-func
                            item.id,
                            JSON.stringify(itemClone)))
                        .then(() => kv.close()) // eslint-disable-line no-loop-func
                        .then(() => true)
                        .catch(err => Promise.reject(new ServerError(err)));

                    console.log(`update result: ${JSON.stringify(updateData, null, 2)}`);
                    if (updateData) {
                        itemClone.id = item.id;
                        return Promise.resolve(itemClone)
                    }
                } // if not, proceed with any remaining photographers until none are left
            }
        }
        // if no photographers were found and/or none was assigned... resolve undefined to indicate one could not be found
        // for the given assignment count
        return Promise.resolve()
    }),
    assignPhotographers: Promise.coroutine(function* aP(event) {
        let photographer;
        for (let i = 0; i < 5; i++) {
            photographer = yield impl.queryAndAssignPhotographersByAssignmentCount(event, i);
            console.log(`queryPhotographers[${i}] result: ${JSON.stringify(photographer, null, 2)}`);
            if (photographer) {
                break // early exit, we found one
            }
        }
        return Promise.resolve(photographer)
    }),
};

// Example event:
// {
//   schema: 'com.nordstrom/retail-stream/1-0-0',
//   origin: 'hello-retail/product-producer-automation',
//   timeOrigin: '2017-01-12T18:29:25.171Z',
//   data: {
//     schema: 'com.nordstrom/product/create/1-0-0',
//     id: 4579874,
//     brand: 'POLO RALPH LAUREN',
//     name: 'Polo Ralph Lauren 3-Pack Socks',
//     description: 'PAGE:/s/polo-ralph-lauren-3-pack-socks/4579874',
//     category: 'Socks for Men',
//   }
// }
module.exports = (event, context, callback) => {
    console.log(JSON.stringify(event));

    const result = event.body;

    if (!result.photographers || !Array.isArray(result.photographers)) {
        result.photographers = []
    }
    impl.assignPhotographers(result)
        .then((photographer) => {
            result.photographer = photographer;
            if (result.photographer) {
                result.photographers.push(result.photographer.id);
                result.assigned = 'true';
                result.assignmentComplete = 'false';
                // result.origin = event.body.origin;
            } else {
                result.assigned = 'false';
            };
            context.headerValues = {
                'Content-Type': 'application/json'
            };
            context
                .status(200)
                .succeed(result)
        })
        .catch((ex) => {
            console.log(`Unexpected exception: ${ex.stack}`);
            callback(ex)
        })
};
