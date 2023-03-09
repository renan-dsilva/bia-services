'use strict';

var response = {
    success: false,
    message: '',
    data: {}
}

exports.response = (res, data = null, code = 200, message = null) => {
    response.success = true;
    response.message = message;
    response.data = data;

    res.status(code).json(response);
}

exports.error = (res, err, code = null) => {
    error(res, err, code);
}

exports.authError = (res, message, code = 401) => {
    let err = new Error(message);
    err.name = 'AuthError'

    error(res, err, code);
}

function error(res, err, code) {
    response.success = false;
    response.message = err.message;
    response.data = err.stack;
    switch (err.name) {
        case 'ValidationError':
            console.error('Error Validating!', err);
            response.message = 'Formulário inválido';
            response.data = Object.keys(err.errors).map(function (key, index) {
                return err.errors[key].message;
            });

            res.status(code || 422).json(response);
            break;
        case 'AuthError':
            res.status(code || 401).json(response);
            break;
        case 'MongoError':
            response.message = err.errmsg;
            res.status(code || 500).json(response);
            break;
        default:
            res.status(code || 400).json(response);
            break;
    }
}