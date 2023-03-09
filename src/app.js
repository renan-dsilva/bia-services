'use strict'

let express = require('express');
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
let config = require('./config');
let cors = require('cors')
let ext = require('./services/extension-service');
let utils = require('./services/utils-service');
let app = express();
let moment = require('moment-timezone');
moment.tz.setDefault("America/Sao_Paulo");

// Connect to database
mongoose.connect(config.connectionString, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
// mongoose.set('debug', true);

// Models
let Process = require('./app/processes/process');
let Support = require('./app/support/support');
let Area = require('./app/areas/area');
let Application = require('./app/applications/application');
let Integration = require('./app/integrations/integration');

// Configuration
app.use(express.static('public'))
app.use(cors());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    const token = utils.extractToken(req);
    let session = utils.getDefaultIfNeeded(token);
    global.CURRENT_SESSION = session;

    next();
});
app.use(bodyParser.urlencoded({ extended: false }));

// Routes
app.use('/domain', require('./app/domain/domain-route'));
app.use('/processes', require('./app/processes/process-route'));
app.use('/support', require('./app/support/support-route'));
app.use('/areas', require('./app/areas/area-route'));
app.use('/applications', require('./app/applications/application-route'));
app.use('/integrations', require('./app/integrations/integration-route'));

module.exports = app;

