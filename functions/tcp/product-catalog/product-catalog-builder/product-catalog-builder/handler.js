'use strict';

const { KV_Store }  = require('kv-store');
const fs = require('fs');



const constants = {
    DBNAME: process.env.DBNAME,
    TABLE_PRODUCT_CATEGORY_NAME: process.env.TABLE_PRODUCT_CATEGORY_NAME,
    TABLE_PRODUCT_CATALOG_NAME: process.env.TABLE_PRODUCT_CATALOG_NAME,
    TABLE_PRODUCT_PRICE_NAME: process.env.TABLE_PRODUCT_PRICE_NAME,
    HOST: process.env.HOST,
    USER: process.env.USER,
    PASS: process.env.PASS
};


const impl = {
    /**
     * Put the given product in to the dynamo catalog.  Example event:
     * {
     *   "schema": "com.nordstrom/retail-stream/1-0-0",
     *   "origin": "hello-retail/product-producer-automation",
     *   "timeOrigin": "2017-01-12T18:29:25.171Z",
     *   "data": {
     *     "schema": "com.nordstrom/product/create/1-0-0",
     *     "id": "4579874",
     *     "brand": "POLO RALPH LAUREN",
     *     "name": "Polo Ralph Lauren 3-Pack Socks",
     *     "description": "PAGE:/s/polo-ralph-lauren-3-pack-socks/4579874",
     *     "category": "Socks for Men"
     *   }
     * }
     * @param event The product to put in the catalog.
     * @param complete The callback to inform of completion, with optional error parameter.
     */
    putProduct: (event, complete) => {
        // event = event.body;
        // console.log('event: ' + event);
        console.log('putProduct');
        console.log(constants.TABLE_PRODUCT_CATALOG_NAME);

        console.log('Here : ' + constants.HOST + ' ' + constants.USER  + ' ' +  constants.PASS + ' '+ constants.TABLE_PRODUCT_CATALOG_NAME);

        const categoryKV = new KV_Store(constants.HOST, constants.USER, constants.PASS,constants.DBNAME, constants.TABLE_PRODUCT_CATEGORY_NAME );
        const catalogKV = new KV_Store(constants.HOST, constants.USER, constants.PASS, constants.DBNAME, constants.TABLE_PRODUCT_CATALOG_NAME);
        const priceKV = new KV_Store(constants.HOST, constants.USER, constants.PASS, constants.DBNAME, constants.TABLE_PRODUCT_PRICE_NAME );

        const updated = Date.now();
        let priorErr;
        const updateCallback = (err) => {
            if (priorErr === undefined) { // first update result
                if (err) {
                    priorErr = err
                } else {
                    priorErr = false
                }
            } else if (priorErr && err) { // second update result, if an error was previously received and we have a new one
                complete(`${constants.METHOD_PUT_PRODUCT} - errors updating DynamoDb: ${[priorErr, err]}`)
            } else if (priorErr || err) {
                complete(`${constants.METHOD_PUT_PRODUCT} - error updating DynamoDb: ${priorErr || err}`)
            } else { // second update result if error was not previously seen
                complete()
            }
        };

        // update the tables productCategory and productPrice
        // which will overwrite the original records with the same key
        categoryKV.init()
            .then(() => categoryKV.put(
                event.body.data.category,
                JSON.stringify({
                    /* *************************************************
                     *    Note: The 'created' field poses a problem in
                     *  our model - an update requires a read first.
                     * ************************************************* */
                    // created: updated,
                    // createdBy: event.origin,
                    updated,
                    updatedBy: event.body.origin,
                })))
            .then(() => categoryKV.close())
            .then(() => {
                if (event.body.data.price) {
                    return priceKV.init()
                        .then(() => priceKV.put(event.body.data.id, event.body.data.price))
                        .then(() => priceKV.close())
                } else {
                    return Promise.resolve()
                }
            })
            .then(() => updateCallback(null))
            .catch(err => updateCallback(err));

        // update the tables productCatalog
        catalogKV.init()
            .then(() => catalogKV.put(
                event.body.data.id,
                JSON.stringify({
                    /* *************************************************
                     *    Note: The 'created' field poses a problem in
                     *  our model - an update requires a read first.
                     * ************************************************* */
                    // created: updated,
                    // createdBy: event.origin,
                    updated,
                    updatedBy: event.body.origin,
                    brand: event.body.data.brand,
                    name: event.body.data.name,
                    description: event.body.data.description,
                    category: event.body.data.category,
                })))
            .then(() => catalogKV.close())
            .then(() => updateCallback(null))
            .catch(err => updateCallback(err));
    },
    /**
     * Put the given image in to the dynamo catalog.  Example event:
     * {
     *   "schema": "com.nordstrom/retail-stream/1-0-0",
     *   "origin": "hello-retail/product-producer-automation",
     *   "timeOrigin": "2017-01-12T18:29:25.171Z",
     *   "data": {
     *     "schema": "com.nordstrom/product/image/1-0-0",
     *     "id": "4579874",
     *     "image": "erik.hello-retail.biz/i/p/4579874"
     *   }
     * }
     * @param event The product to put in the catalog.
     * @param complete The callback to inform of completion, with optional error parameter.
     */
    putImage: (event, complete) => {
        const kv = new KV_Store(constants.HOST, constants.USER, constants.PASS,
            constants.DBNAME, constants.TABLE_PRODUCT_CATALOG_NAME);

        const updated = Date.now();
        console.log('REACHED HERE')
        kv.init()
            .then(() => kv.get(event.body.data.id))
            .then((res) => {
                const parsedRes = JSON.parse(res);
                parsedRes.image = event.body.data.image;
                parsedRes.updated = updated;
                parsedRes.updatedBy = event.origin;
                return parsedRes;
            })
            .then(res => kv.put(event.body.data.id, JSON.stringify(res)))
            .then(() => kv.close())
            .then(complete)
            .catch(err => complete(err))
    },
};

/**
 * 2 end points
 *
 * '/product'
 * '/image'
 */
const api = {
    handleInput: (event, context, callback) => {
        if (event.path == '/product') {
            api.productCreate (event, context, callback);
        } else if (event.path == '/image') {
            api.putImage (event, context, callback)
        }
    },
    productCreate: (event, context, callback) => {
        console.log('Full path: ' +  process.env.Http_Path);
        console.log(event);
        impl.putProduct(event, callback);
    },
    putImage: (event, context, callback) => {
        impl.putImage(event, callback);
    }
}



module.exports = api.handleInput;