let mongoose = require('mongoose');
let config = require('../config');
let extensions = require('../services/extension-service');
let mongo = require('mongodb').MongoClient;

let Reset = "\x1b[0m"
let FgBlack = "\x1b[30m"
let FgRed = "\x1b[31m"
let FgGreen = "\x1b[32m"
let BgYellow = "\x1b[43m"

// Connect to database
mongoose.connect(config.connectionString, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });

let applications = require('./application-seed');
let areas = require('./area-seed');
let processes = require('./process-seed');

async function start(miliseconds) {
    await dropAll();
    await sleep(miliseconds);

    await applications.create();
    await areas.create();
    await processes.create();
    await sleep(miliseconds);
}

async function dropAll() {
    await drop('Application', 'applications');
    await drop('Area', 'areas');
    await drop('Process', 'processes');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function drop(model, collection) {
    mongo.connect(config.connectionString, function (err, db) {
        if (err) throw err;
        let dbo = db.db(config.database);
        dbo.listCollections({ name: collection })
            .next(function (err, collinfo) {
                if (collinfo) {
                    dbo.collection(collection).drop(function (err, delOK) {
                        if (err)
                            throw err;
                        if (delOK) {
                            console.info(FgRed + '%s' + Reset, model + ' - Collection deleted');
                        }
                        db.close();
                    });
                }
            });
    });
}

start(1000);