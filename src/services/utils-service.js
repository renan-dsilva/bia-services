let ext = require('../services/extension-service');
let Enum = require('../enums');

let env = exports.env = function () {
    let env = getDefaultIfNeeded(process.env.NODE_ENV, Enum.Environment.development)

    return env;
}

exports.isProduction = function () {
    return env() == Enum.Environment.production;
}

let getByEnv = exports.getByEnv = function (productinoValue, developmentValue) {
    return env() == Enum.Environment.production ? productinoValue : developmentValue;
}

exports.asyncForEach = async function (array, callback) {
    let map = getDefaultIfNeeded(array, []);

    for (let index = 0; index < map.length; index++) {
        await callback(array[index], index, array);
    }
}

exports.parseDatestoUserLocale = function (offset, object) {
    if (object == null) {
        return
    }

    if (!Array.isArray(object)) {
        object = [object];
    }

    object.parseDatestoUserLocale(offset);
}

exports.extractIdFrom = function (object) {
    if (object == null) {
        return null;
    }

    if (object.constructor.name === 'ObjectID') {
        return object;
    }

    if (object.id != null) {
        return object.id;
    }

    if (object._id != null) {
        return object._id;
    }

    return getDefaultIfNeeded(object, null);
}

exports.extractToken = (req) => {
    var token = (typeof req.body !== 'undefined' && req.body.auth_token) ||
        (typeof req.query !== 'undefined' && req.query.auth_token) ||
        (typeof req.headers !== 'undefined' && req.headers['x-access-token']) ||
        (typeof req.headers !== 'undefined' && req.headers['authorization']);

    return token;
}

exports.getGatewayApiKey = function (school) {
    let _school = getDefaultIfNeeded(school);
    if (!_school)
        return '';

    let prod = getDefaultIfNeeded(_school.asaas_api_key);
    let sandbox = getDefaultIfNeeded(_school.asaas_api_key_sandbox);
    let token = getByEnv(prod, sandbox);

    return getDefaultIfNeeded(token, '');
}

exports.getGatewayWalletId = function (school) {
    let _school = getDefaultIfNeeded(school);
    if (!_school)
        return '';

    let prod = getDefaultIfNeeded(_school.asaas_wallet_id);
    let sandbox = getDefaultIfNeeded(_school.asaas_wallet_id_sandbox);
    let token = getByEnv(prod, sandbox);

    return getDefaultIfNeeded(token, '');
}

exports.getGatewayCustomerId = function (parent) {
    let _parent = getDefaultIfNeeded(parent);
    if (!_parent)
        return '';

    let prod = getDefaultIfNeeded(_parent.asaas_id);
    let sandbox = getDefaultIfNeeded(_parent.asaas_id_sandbox);
    let token = getByEnv(prod, sandbox);

    return getDefaultIfNeeded(token, '');
}

exports.getPaymentId = function (payment) {
    let _payment = getDefaultIfNeeded(payment);
    if (!_payment)
        return '';

    let prod = getDefaultIfNeeded(_payment.asaas_id);
    let sandbox = getDefaultIfNeeded(_payment.asaas_id_sandbox);
    let token = getByEnv(prod, sandbox);

    return getDefaultIfNeeded(token, '');
}

exports.cleanObject = function (object, excludeFields) {
    excludeFields = getDefaultIfNeeded(excludeFields, []);
    for (var propName in object) {
        if (!excludeFields.includes(propName)) {
            if (object[propName] === null || object[propName] === undefined) {
                delete object[propName];
            }
        }
    }

    return object
}

exports.getRandomInt = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.currency = function (value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

let getDefaultIfNeeded = exports.getDefaultIfNeeded = function (value, default_content) {
    var content = default_content;
    if (typeof value !== 'undefined' && value != '' && value != null && `${value}`.toLowerCase() != 'null') {
        content = value;
    }

    if (Array.isArray(content)) {
        if (content.length == 1 && content[0] == null) {
            return null
        }
    }

    return content;
}

exports.isValidCPF = function (cpf) {
    cpf = `${cpf}`.replace(/[\s.-]*/igm, '')
    if (
        !cpf ||
        cpf.length != 11 ||
        cpf == "00000000000" ||
        cpf == "11111111111" ||
        cpf == "22222222222" ||
        cpf == "33333333333" ||
        cpf == "44444444444" ||
        cpf == "55555555555" ||
        cpf == "66666666666" ||
        cpf == "77777777777" ||
        cpf == "88888888888" ||
        cpf == "99999999999"
    ) {
        return false
    }
    var soma = 0
    var resto
    for (var i = 1; i <= 9; i++)
        soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i)
    resto = (soma * 10) % 11
    if ((resto == 10) || (resto == 11)) resto = 0
    if (resto != parseInt(cpf.substring(9, 10))) return false
    soma = 0
    for (var i = 1; i <= 10; i++)
        soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i)
    resto = (soma * 10) % 11
    if ((resto == 10) || (resto == 11)) resto = 0
    if (resto != parseInt(cpf.substring(10, 11))) return false
    return true
}

exports.extractMimetypeFromBase64 = function (base64) {
    var mimeType = '';
    var signatures = [
        "application/pdf",
        "image/gif",
        "image/gif",
        "image/png"
    ];
    signatures.forEach(signature => {
        if (base64.includes(signature)) {
            mimeType = signature;
        }
    });

    if (mimeType == '') {
        const firstCharacter = base64.substr(0, 1);
        switch (firstCharacter) {
            case '/':
                return 'image/jpeg';
            case 'i':
                return 'image/png';
            case 'R':
                return 'image/gif';
            case 'U':
                return 'application/webp';
            case 'J':
                return 'application/pdf';
        }
    }

    return mimeType;
}