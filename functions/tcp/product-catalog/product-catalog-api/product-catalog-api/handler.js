'use strict';

const { KV_Store } = require('kv-store');

const constants = {
    TABLE_PRODUCT_CATEGORY_NAME: process.env.TABLE_PRODUCT_CATEGORY_NAME,
    TABLE_PRODUCT_CATALOG_NAME: process.env.TABLE_PRODUCT_CATALOG_NAME,
    HOST: process.env.HOST,
    USER: process.env.USER,
    PASS: process.env.PASS,
    DBNAME: process.env.DBNAME,
};

const api = {
    // TODO deal with pagination
    categories: (event, context) => {
        context.headerValues = {
            'Content-Type': 'application/json'
        };

        const kv = new KV_Store(constants.HOST, constants.USER,
            constants.PASS, constants.DBNAME, constants.TABLE_PRODUCT_CATEGORY_NAME);


        kv.init()
            .then(() => kv.keys())
            .then(result => kv.close().then(() => result))
            .then(result => {
                context
                    .status(200)
                    .succeed(result);
            })
            .catch(err => {
                console.error(err);
                context.fail(JSON.stringify({
                    error: 'error in list categorises'
                }));
            });

    },
    // TODO this is only filter/query impl, also handle single item request
    // TODO deal with pagination
    products: (event, context) => {

        context.headerValues = {
            'Content-Type': 'application/json'
        };

        const kv = new KV_Store(constants.HOST, constants.USER,
            constants.PASS, constants.DBNAME, constants.TABLE_PRODUCT_CATALOG_NAME);

        console.log(event.body);
        // TODO Make sure there's an API that exposes the photos.
        kv.init()
            .then(() => kv.entries())
            .then(results => kv.close().then(() => results))
            .then(results => {
                context.status(200).succeed(results.filter(entry => JSON.parse(entry.val).category === event.body.queryStringParameters.category).map(entry => ({
                    id: entry.key,
                    category: JSON.parse(entry.val).category,
                    brand: JSON.parse(entry.val).brand,
                    name: JSON.parse(entry.val).name,
                    description: JSON.parse(entry.val).description,
                })));
            })
            .catch(err => {
                console.error(err);
                context.fail(JSON.stringify({
                    error: 'error in list products'
                }));
            });
    },
};

/**
 * 2 end points
 *
 * '/categories'
 * '/products'
 */
const entryPoint = {
    handleInput: (event, context) => {

        console.log (event);
        if (event.path == '/products') {
            api.products (event, context);
        } else if (event.path == '/categories') {
            api.categories (event, context);
        }
    },

}

module.exports = entryPoint.handleInput;


