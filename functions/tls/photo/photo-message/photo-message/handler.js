'use strict';

/* ********************************************************************
 *                 Hello Retail Minimization:
 *  - Removed all twilio code, in particular all code in charge of
 *    sdk, key decryption, and message send.
 *  - Removed all aws.kms code, which was used for managing keys.
 *  - Removed all aws code, which was only used for kms.
 * ******************************************************************** */

const BbPromise = require('bluebird');
const nodemailer = require('nodemailer');

/**
 * Constants
 */
const constants = {
    // internal
    ERROR_SERVER: 'Server Error',
    // module and method names
    METHOD_HANDLER: 'handler',
    METHOD_SEND_MESSAGE: 'sendMessage',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_ADDRESS: process.env.SMTP_ADDRESS
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

/**
 * Utility Methods (Internal)
 */
const util = {
    serverError: (method, err) => {
        console.log(`${method} - ${constants.ERROR_SERVER}: ${err}`);
        return util.response(500, constants.ERROR_SERVER)
    },
};

/**
 * Implementation (Internal)
 */
const impl = {
    sendMessage: (event) => {
        function createTransporter() {
            // create reusable transporter object using the default SMTP transport
            const transporter = nodemailer.createTransport({
                host: constants.SMTP_HOST,
                port: constants.SMTP_PORT,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: constants.SMTP_USER,
                    pass: constants.SMTP_PASSWORD,
                },
            });
            return Promise.resolve(transporter);
        }

        const messageText =
            `
Hello ${event.body.data.photographer.name}!
Please snap a pic of:
    ${event.body.data.name}

Created by:
    ${event.body.data.merchantName}`;

        const mailOptions = {
            from: '"The Store" <boss@store.com>',
            to: `${event.body.data.photographer.phone}@photogs.com`,
            subject: 'New Photography Assignment From The Store',
            text: messageText,
            html: `<p>${messageText}</p>`,
        };

        console.log('HOST: %s PORT: %d EMAIL: %s, PASS: %s',
            constants.SMTP_HOST, constants.SMTP_PORT, constants.SMTP_USER,
            constants.SMTP_PASSWORD)

        createTransporter()
            .then(trans => trans.sendMail(mailOptions))
            .then(
                (info) => {
                    console.log('Message sent: %s', info.messageId);
                    // Preview only available when sending through an Ethereal account
                    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

                    return Promise.resolve(info);
                })
            .catch(
                err => BbPromise.reject(new ServerError(`${constants.METHOD_SEND_MESSAGE} - Error sending message to photographer: ${JSON.stringify(err, null, 2)}`)) // eslint-disable-line comma-dangle
            );
    },
};


module.exports = (event, context, callback) => {

    BbPromise.resolve(event)
        .then(impl.sendMessage)
        .then((messageInfo) => {
            console.log(`Success: ${JSON.stringify(messageInfo, null, 2)}`);
            callback(null, event)
        })
        .catch((ex) => {
            console.log(JSON.stringify(ex, null, 2));
            callback(`${ex.message}:\n${ex.stack}`)
        })
};

