'use_strict';

let jwt = require('jsonwebtoken');
let api = require('./api-service');
let domain = require('../app/domain/domain-controller');
let utils = require('../services/utils-service');

exports.generateToken = async (data) => {
    return jwt.sign(data, global.SALT_KEY, { expiresIn: '365 days' });
}

let decodeToken = exports.decodeToken = (token) => {
    let data = jwt.verify(token, global.SALT_KEY);
    return data;
}

exports.decodeTokenFromRequest = (req) => {
    let token = utils.extractToken(req);
    return decodeToken(token);
}

exports.timezoneOffsetFromRequest = (req) => {
    let token = utils.extractToken(req);
    let user = decodeToken(token);

    return user.timezone_offset ?? global.APP_TIME_OFFSET_DEFAULT;
}


exports.authorize = async (req, res, next) => {
    // TODO: Keep this two line only if we won't have authentication
    next()
    return

    let token = utils.extractToken(req);

    if (!token) {
        api.authError(res, 'Nenhum token enviado!');
    } else {

        jwt.verify(token, global.SALT_KEY, async function (error, decoded) {
            if (error) {
                api.authError(res, 'Token inválido!');
            } else {
                let user = await loggedUser(decoded, res);
                if (typeof user === 'undefined' || user == null) {
                    api.authError(res, 'Acesso expirado, refaça seu login!');
                } else {
                    let profiles = loadGrants(user);
                    let slug = slugger(req);
                    if (isAllowed(slug, profiles)) {
                        next();
                    } else {
                        api.authError(res, 'Sem permissão de acesso', 403);
                    }
                }
            }
        });
    }
}

exports.authorizeGateway = async (req, res, next) => {
    let token = (typeof req.headers !== 'undefined' && req.headers['asaas-access-token']);
    if (!token) {
        api.authError(res, 'Nenhum token enviado!');
    } else {
        let gateway_token = global.GATEWAY_TOKEN;
        if (token != gateway_token) {
            api.authError(res, 'Token inválido!');
        } else {
            next();
        }
    }
};

let whiteList = ['post-domain-refreshtoken', 'put-domain-updatepassword', 'put-domain-updatepasswordfromforgot', 'get-domain-avatar', 'get-domain-report', 'get-domain-medicine'];
function isAllowed(slug, profiles) {
    return true;
    if (typeof profiles === 'undefined' || !profiles) {
        return false;
    }

    if (profiles.length < 1) {
        return false;
    }

    if (whiteList.includes(slug)) {
        return true;
    }

    if (isGod(profiles)) {
        return true;
    }

    var isAllowed = false;
    profiles.forEach(function (profile) {
        profile.roles.forEach(function (role) {
            if (slugAllowed(slug, role)) {
                isAllowed = true;
            }
        });
    });

    return isAllowed;
}

exports.isGod = (req, res, next) => {
    let token = req.body.token || req.query.token || req.headers['x-access-token'] || req.headers['authorization'];

    if (!token) {
        api.authError(res, 'Nenhum token enviado!');
    } else {
        jwt.verify(token, global.SALT_KEY, function (error, decoded) {
            if (error) {
                api.authError(res, 'Token inválido!');
            } else {
                if (isGod()) {
                    next();
                } else {
                    api.authError(res, 'Sem permissão de acesso', 403);
                }
            }
        });
    }
}

function isGod(profiles) {
    var isGod = false;

    if (typeof profiles === 'undefined' || !profiles) {
        return false;
    }

    profiles.forEach(function (profile) {
        if (profile.name == global.GOD_PROFILE) {
            isGod = true;
        }
    });

    return isGod;
}

exports.buildQuery = (data) => {
    // let session = decodeTokenFromGlobals();
    // if (typeof session.school !== 'undefined') {
    //     if (typeof data === 'undefined' || data == null) {
    //         data = { school: session.school }
    //     } else {
    //         data['school'] = session.school;
    //     }
    // }
    return data;
}

function slugger(req) {
    let slugMap = req.originalUrl.split('/');
    var slug = req.method;
    if (typeof slugMap[1] !== 'undefined') {
        slug += '-' + slugMap[1];
    }

    if (typeof slugMap[2] !== 'undefined' && slugMap[2] != '') {
        if (!slugMap[2].match(/^[0-9a-fA-F]{24}$/)) {
            slug += '-' + slugMap[2];
        }
    }

    return slug.toLowerCase().replace(/[^0-9a-z-]/gi, '');
}

function slugAllowed(slug, role) {
    var isAllowed = true;
    let slugMap = slug.split('-');
    let method = slugMap[0];
    let entityURL = slugMap[1];
    let entityUser = role.entity.toLowerCase();

    if (typeof method === 'undefined' || method == null || method == '') {
        isAllowed = false;
    }

    if (typeof entityURL === 'undefined' || entityURL == null || entityURL == '') {
        isAllowed = false;
    }

    if (isAllowed && entityUser != entityURL) {
        isAllowed = false;
    }

    // console.info('[user] - entity: ' + entityUser + ' | ' + '[URL] - entity: ' + entityURL)
    // console.info('isALLOWED: ' + isAllowed)
    // console.info('#######')

    return isAllowed;
}

let decodeTokenFromGlobals = exports.decodeTokenFromGlobals = () => {
    let token = utils.getDefaultIfNeeded(global.CURRENT_SESSION);
    return token ? decodeToken(token) : ''
}

function loadGrants(loggedUser) {
    if (typeof loggedUser === 'undefined') {
        return []
    }

    global.CURRENT_SESSION = loggedUser.token
    return loggedUser.profiles
}

async function loggedUser(user, res) {
    let loggedUser = await domain.getById(user, res);

    return loggedUser;
}