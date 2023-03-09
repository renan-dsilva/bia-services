'use strict';

let md5 = require('md5');
let api = require('../../services/api-service');
let authService = require('../../services/auth-service');
let emailService = require('../../services/email-service');
let path = require('path');
let file = require("fs");
let Enum = require('../../enums');
let utils = require('../../services/utils-service');
let ext = require("../../services/extension-service");
let moment = require('moment-timezone');
let s3 = require('../../services/aws/s3-service');

moment.locale('pt-BR');

exports.version = async (req, res, next) => {
    try {
        api.response(res, { version: 'v0.0.1' }, 200, 'This is a public service to check the system version');
    } catch (e) {
        api.error(res, e);
    }
}

// Authorizations //

exports.authenticate = async (req, res, next) => {

    try {
        let body = req.body;
        var provider;
        var source;

        let email = utils.getDefaultIfNeeded(body.email);
        if (!email) {
            let err = new Error();
            err.message = 'E-mail ou Senha não informados.';
            err.name = 'AuthError';
            api.error(res, err, 400);
            return
        }

        source = await auth(email, body.password);
        if (!source) {
            let err = new Error('Usuário ou senha inválidos!');
            err.name = 'AuthError'
            api.error(res, err);
            return
        }

        provider = staffProvider
        source.origin = Enum.UserOrigin.staff
        source.timezone_offset = body.timezone_offset;
        let newSource = await populateAuthResponse(source, true);

        if (newSource.first_access) {
            await staffProvider.update(source._id, { first_access: false });
        }

        api.response(res, newSource, 200);
    } catch (e) {
        api.error(res, e);
    }
}

exports.refreshToken = async (req, res, next) => {
    let data = authService.decodeTokenFromRequest(req);
    var provider;

    try {
        let source = await getByIdFrom(staffProvider, data.id);
        if (source) {
            provider = staffProvider
            source.origin = Enum.UserOrigin.staff
        } else {
            source = await getByIdFrom(parentProvider, data.id);

            if (source) {
                provider = parentProvider
                source.origin = Enum.UserOrigin.parent
            } else {
                let err = new Error('Usuário ou senha inválidos!');
                err.name = 'AuthError'
                api.error(res, err);
                return
            }
        }

        // if (source.first_access) {
        //     let err = new Error('Usuário não confirmado!');
        //     err.name = 'AuthError'
        //     api.error(res, err);
        //     return
        // }

        source.timezone_offset = data.timezone_offset;
        var newSource = await populateAuthResponse(source);

        // let givenToken = req.body.token || req.query.token || req.headers['x-access-token'] || req.headers['authorization'];
        // let dbToken = source.token
        // if (givenToken != dbToken) {
        //     let err = new Error('Seu acesso expirou, refaça seu login.');
        //     err.name = 'AuthError'
        //     api.error(res, err, 401);
        //     return
        // }

        await provider.update(source._id, { token: newSource.token });
        api.response(res, newSource, 201);

    } catch (e) {
        api.error(res, e);
    }
}

exports.activate = async (req, res, next) => {
    if (typeof req.params.token === 'undefined' || req.params.token == null || req.params.token == '') {
        let err = new Error('Nenhum token de ativação informado!');
        err.name = 'AuthError'
        api.error(res, err, 400);
        return
    }

    let data = await authService.decodeToken(req.params.token);
    var provider;

    if (data == null) {
        let err = new Error('Token de ativação inválido ou expirado!');
        err.name = 'AuthError'
        api.error(res, err, 401);
        return
    }

    try {
        let source = await getByIdFrom(staffProvider, data.id);
        if (source) {
            provider = staffProvider
            source.origin = Enum.UserOrigin.staff
        } else {
            source = await getByIdFrom(parentProvider, data.id);

            if (source) {
                provider = parentProvider
                source.origin = Enum.UserOrigin.parent
            } else {
                let err = new Error('Usuário ou senha inválidos!');
                err.name = 'AuthError'
                api.error(res, err);
                return
            }
        }

        let newSource = await provider.update(source._id, { status: Enum.Status.activated });
        api.response(res, newSource, 201);

    } catch (e) {
        api.error(res, e);
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        let email = req.body.email;
        if (typeof email === 'undefined' || email == '' || email == null) {
            let err = new Error('E-mail não informado');
            err.name = 'AuthError'
            api.error(res, err);
            return
        }

        var provider;
        let source = await getByEmailFrom(staffProvider, email);
        if (source.length > 0) {
            source[0].origin = Enum.UserOrigin.staff
            provider = staffProvider;
        } else {
            source = await getByEmailFrom(parentProvider, email);

            if (source.length > 0) {
                source[0].origin = Enum.UserOrigin.parent
                provider = parentProvider;
            } else {
                let err = new Error('E-mail não encontrado');
                err.name = 'AuthError'
                api.error(res, err);
                return
            }
        }

        source = source[0];
        provider.fillable('id name pin_code');
        let pin = utils.getDefaultIfNeeded(source.pin_code, `${Math.floor(1000 + Math.random() * 9000)}`);

        await provider.update(source._id, { pin_code: pin });
        source.timezone_offset = req.body.timezone_offset;
        let data = await populateAuthResponse(source);

        data['pin_code'] = pin;
        await sendPinCodeToParent(data);
        api.response(res, data, 200, 'Enviamos um PIN de ativação para o seu e-mail!');
    } catch (e) {
        api.error(res, e);
    }
};

exports.validatePin = async (req, res, next) => {
    try {
        let pin = req.body.pin_code;
        if (typeof pin === 'undefined' || pin == '') {
            let err = new Error('PIN não informado');
            err.name = 'AuthError'
            api.error(res, err);
            return
        }

        let userID = req.body.id;
        if (userID == null || typeof userID === 'undefined' || userID == '') {
            let err = new Error('usuário não informado');
            err.name = 'AuthError'
            api.error(res, err);
            return
        }

        var provider;
        let source = await getByIdFrom(staffProvider, userID);
        if (source) {
            source.origin = Enum.UserOrigin.staff
            provider = staffProvider;
        } else {
            source = await getByIdFrom(parentProvider, userID);

            if (source) {
                source.origin = Enum.UserOrigin.parent
                provider = parentProvider;
            } else {
                let err = new Error('Usuário ou senha inválidos!');
                err.name = 'AuthError'
                api.error(res, err);
                return
            }
        }

        if (source.pin_code != pin) {
            let err = new Error('PIN Inválido!');
            err.name = 'AuthError'
            api.error(res, err);
            return
        }

        await provider.update(source._id, { pin_code: '' });

        source.timezone_offset = req.body.timezone_offset;
        let newSource = await populateAuthResponse(source, true);
        api.response(res, newSource, 201);
    } catch (e) {
        api.error(res, e);
    }
};

var updatePassword = exports.updatePassword = async (req, res, next) => {
    try {
        var session = authService.decodeTokenFromRequest(req);
        var origin = '';

        if (!session) {
            let err = new Error();
            err.message = 'Seu acesso expirou, refaça seu login.';
            err.name = 'AuthError';
            api.error(res, err, 401);
            return
        }

        var provider;
        var source;
        if (req.body.fromForgot != null && req.body.fromForgot && req.body.id != null) {
            let user = { id: req.body.id };
            source = await getById(user, res);
            if (source) {
                origin = Enum.UserOrigin.staff
                provider = staffProvider;
            } else {
                let err = new Error('Usuário não econtrado!');
                err.name = 'AuthError'
                api.error(res, err);
                return
            }
        } else {
            source = await auth(req.body.email, req.body.old_password);
            if (source) {
                origin = Enum.UserOrigin.staff
                provider = staffProvider;
            } else {
                source = await auth(parentProvider, req.body.email, req.body.old_password);
                if (source) {
                    origin = Enum.UserOrigin.parent
                    provider = parentProvider;
                } else {
                    let err = new Error('Usuário ou senha inválidos!');
                    err.name = 'AuthError'
                    api.error(res, err);
                    return
                }
            }
        }

        source = await provider.update(source.id, {
            password: md5(req.body.password + global.SALT_KEY)
        });
        if (source) {
            source.origin = origin;
            source.first_access = false;
            source.timezone_offset = req.body.timezone_offset;
            let newSource = await populateAuthResponse(source, true);
            await provider.update(source._id, { first_access: newSource.first_access });
            api.response(res, newSource, 201, 'Senha atualizado com sucesso!');
            return
        } else {
            let error = new Error('Senha não encontrada');
            api.error(res, error)
        }
    } catch (e) {
        api.error(res, e);
    }
};

exports.updatePasswordFromForgot = async (req, res, next) => {
    try {
        var session = authService.decodeTokenFromRequest(req);
        let err = new Error();

        if (!session) {
            err.message = 'Seu acesso expirou, refaça seu login.';
            err.name = 'AuthError';
            api.error(res, err, 401);
            return
        }

        req.body['fromForgot'] = true;
        updatePassword(req, res, next);

    } catch (e) {
        api.error(res, e);
    }
};

let getById = exports.getById = async (user, res) => {
    var provider;
    var source;
    var newSource;

    try {
        source = await getByIdFrom(staffProvider, user.id);
        if (source) {
            provider = staffProvider
            source.origin = Enum.UserOrigin.staff
        } else {
            source = await getByIdFrom(parentProvider, user.id);

            if (source) {
                provider = parentProvider
                source.origin = Enum.UserOrigin.parent
            }
        }

        if (source) {
            newSource = await populateAuthResponse(source);
        }

        return newSource;
    } catch (e) {
        console.error(e);
        return null;
    }

}

exports.getByToken = async (token) => {
    var provider;
    var source;
    var newSource;

    try {
        source = await getByTokenFrom(staffProvider, token);
        if (source) {
            provider = staffProvider
            source.origin = Enum.UserOrigin.staff
        } else {
            source = await getByTokenFrom(parentProvider, token);

            if (source) {
                provider = parentProvider
                source.origin = Enum.UserOrigin.parent
            }
        }

        if (source) {
            let data = authService.decodeToken(token);
            source.timezone_offset = data.timezone_offset;
            newSource = await populateAuthResponse(source);
        }

        return newSource;
    } catch (e) {
        console.error(e);
        return null;
    }

}

exports.subscribe = async (req, res, next) => {
    await subscription(req, res, true, req.params.token);
}

exports.unsubscribe = async (req, res, next) => {
    await subscription(req, res, false, '');
}

exports.showVideoSupport = async (req, res, next) => {
    await videoSupport(req, res, true);
}

exports.saveMedia = async (req, res, next) => {
    const mediaId = utils.getDefaultIfNeeded(req.body['id'])
    const base64 = utils.getDefaultIfNeeded(req.body['media'])

    if (!mediaId) {
        let err = new Error();
        err.message = 'Nenhum usuário informado';
        api.error(res, err, 400);
        return
    }


    if (!base64) {
        let err = new Error();
        err.message = 'Nenhum conteúdo informado';
        api.error(res, err, 400);
        return
    }
    const fileKey = `media/${mediaId}`;
    const location = await s3.uploadMedia(fileKey, base64);

    api.response(res, { url: location }, 200, 'Media salva com sucesso');
};

exports.deleteMedia = async (req, res, next) => {
    var url = utils.getDefaultIfNeeded(req.body['url'])
    if (!url) {
        let err = new Error();
        err.message = 'Nenhuma url informada';
        api.error(res, err, 400);
        return
    }

    s3.deleteMedias(url, {}, false);

    api.response(res, {}, 200, 'Media removido com sucesso');
};


// Videos
exports.videos = async (req, res, next) => {
    getMedia(res, `/source/videos/` + req.params.id + '.mp4');
};


// Functions //
function authValidation(req, res) {
    if (typeof req.body.token === 'undefined' || req.body.token == null || req.body.token == '') {
        let err = new Error('O token fornecido pelo Facebook deve ser informado!');
        err.name = 'AuthError'
        api.error(res, err, 400);
        return
    }

    if (typeof req.body.origin === 'undefined' || req.body.origin == '') {
        let err = new Error();
        err.message = 'Atributo origin não informado [parent|staff]';
        err.name = 'AuthError';
        api.error(res, err, 400);
        return
    }
}

async function subscription(req, res, subscribed, fcmToken) {
    if (subscribed) {
        if (fcmToken == null || fcmToken == '') {
            let error = new Error('Autorização para notificação não enviada');
            api.error(res, error, 400)
            return false
        }
    }

    let data = authService.decodeTokenFromRequest(req);
    var provider;

    try {
        var source = await getByIdFrom(staffProvider, data.id);
        if (source) {
            provider = staffProvider;
        } else {
            source = await getByIdFrom(parentProvider, data.id);

            if (source) {
                provider = parentProvider;
            } else {
                let err = new Error('Usuário ou senha inválidos!');
                err.name = 'AuthError'
                api.error(res, err);
                return
            }
        }

        var newData = { subscribed: subscribed }
        if (fcmToken != null && fcmToken != '') {
            newData.fcm_token = fcmToken;
        }
        provider.update(data.id, newData);

        api.response(res, {}, 201);

    } catch (e) {
        api.error(res, e);
    }
}

async function auth(email, password) {
    let source = await staffProvider.authenticate({
        email: email.toLowerCase(),
        password: md5(password + global.SALT_KEY)
    });

    return source;
}

async function getByIdFrom(provider, userID) {
    let source = await provider.getById(userID);
    return source;
}

async function getByTokenFrom(provider, token) {
    let source = await provider.getByToken(token);
    return source;
}

async function getByEmailFrom(provider, email) {
    let source = await provider.getByEmail(email);

    return source;
}

function getMedia(res, filePath) {
    try {
        let root = path.dirname(require.main.filename);
        let imgPath = root + filePath;
        if (filePath.fileExists()) {
            res.sendFile(imgPath);
        } else {
            let err = new Error('Imagem não encontrada');
            err.name = 'AuthError'
            api.error(res, err, 404);
        }
    } catch (e) {
        api.error(res, e);
    }
}

async function sendPinCodeToParent(parent) {

    var room = {
        members: [parent._id],
        name: `${global.APP_NAME} - PIN de Validação *️⃣*️⃣*️⃣*️⃣`,
        desc: global.APP_DESC,
        status: Enum.Status.activated,
        type: Enum.ChatroomType.private,
        read_only: true,
    };
    let chatroom = await chatroomProvider.create(room);

    if (chatroom) {
        let school = await schoolProvider.getById(parent.school);
        let data = {
            chatroom: chatroom,
            sender: school,
            pin_code: parent.pin_code,
        }

        let message = await chatSeed.pinCodeToParentPayload(data);
        await chatProvider.create(message);

        await utils.asyncForEach(parent.emails, async (email) => {
            message.to = email;
            await emailService.send(message);
        });
    }
}

async function populateAuthResponse(source, updateToken = false) {
    let timezoneOffset = utils.getDefaultIfNeeded(source.timezone_offset, global.APP_TIME_OFFSET_DEFAULT);
    const userId = source._id;
    let dataToken = {
        id: userId,
        origin: source.origin,
        timezone_offset: timezoneOffset,
    }

    let token = await authService.generateToken(dataToken);
    let tokenObj = { token: token };
    global.CURRENT_SESSION = token

    let response = {
        id: userId,
        status: source.status,
        subscribed: source.subscribed,
        fcm_token: source.fcm_token,
        first_access: source.first_access,
        access_code: source.access_code,
        emails: source.emails,
        phones: source.phones,
        name: source.name,
        doc: source.doc,
        gender: source.gender,
        profiles: source.profiles,
        origin: source.origin,
    };

    if (updateToken) {
        await staffProvider.update(userId, tokenObj);
    }

    return Object.assign(tokenObj, response);
}

