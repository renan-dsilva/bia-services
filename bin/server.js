'use strict'

let app = require('../src/app');
const https = require('http');
let debug = require('debug')('nodestr:server');
var fs = require('fs');

let port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

let server = https.createServer({
    // key: fs.readFileSync('/etc/apache2/ssl/bia/domain.key', 'utf8'),
    // cert: fs.readFileSync('/etc/apache2/ssl/bia/e1381c51aa81461.crt', 'utf8'),
    // ca: fs.readFileSync('/etc/apache2/ssl/bia/gd_bundle-g2-g1.crt', 'utf8')
}, app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

console.info('All set, lets run! Port: ' + port);

function normalizePort(val) {
    let port = parseInt(val, 10);
    if (isNaN(port)) {
        return val;
    }

    if (port > 10) {
        return port;
    }

    return false;
}

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    switch (error.code) {
        case 'EACCESS':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string' ? 'Pipe ' + addr : 'Pipe ' + addr.port;

    debug('Listening on ' + bind);
}