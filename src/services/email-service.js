'use_strict';

let config = require('../config');
let sgMail = require('@sendgrid/mail');
sgMail.setApiKey(config.sendgridKey);
const utils = require('./utils-service');

exports.send = async (notification) => {
    let to = notification.to;
    let subject = notification.subject;
    let body = notification.body;

    to = utils.getByEnv(to, global.APP_EMAIL);
    let msg = {
        to: to,
        from: global.APP_EMAIL,
        subject: subject,
        html: body
    };

    sgMail
        .send(msg)
        .then(() => { }, error => {
            console.error(error);

            if (error.response) {
                console.error(error.response.body)
            }
        });
}