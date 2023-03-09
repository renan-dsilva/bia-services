'use strict';

let provider = require('./integration-provider');
let api = require('../../services/api-service');
let Enum = require('../../enums');
let ext = require('../../services/extension-service');
let utils = require('../../services/utils-service');

exports.post = async (req, res, next) => {
    try {

        let body = await populate(req.body);
        let source = await provider.create(body);

        api.response(res, source, 201, 'Registry saved successfully!');
    } catch (e) {
        console.error(e);
        api.error(res, e);
    }
}

exports.put = async (req, res, next) => {
    try {

        let body = await populate(req.body);
        let source = await provider.update(req.params.id, body);

        if (source) {
            api.response(res, source, 201, 'Perfil atualizado com sucesso!');
        } else {
            let error = new Error('Perfil não encontrado');
            api.error(res, error)
        }

    } catch (e) {
        api.error(res, e);
    }
}

exports.delete = async (req, res, next) => {
    try {
        await provider.delete(req.params.id);
        api.response(res, req.body, 201, 'Perfil removido com sucesso!')
    } catch (e) {
        api.error(res, e);
    }
}

exports.get = async (req, res, next) => {
    try {
        var data = await provider.get();
        api.response(res, data);
    } catch (e) {
        api.error(res, e);
    }
}

exports.getByName = async (req, res, next) => {
    try {
        let name = req.params.name;
        var data = await provider.getByName(name);
        api.response(res, data);
    } catch (e) {
        api.error(res, e);
    }
}

exports.getById = async (req, res, next) => {
    try {
        let id = req.params.id;
        var data = await provider.getById(id);
        api.response(res, data);
    } catch (e) {
        api.error(res, e);
    }
}

exports.getByApplication = async (req, res, next) => {
    try {
        let application = req.params.application;
        var data = await provider.getByApplication(application);
        api.response(res, data);
    } catch (e) {
        api.error(res, e);
    }
}

async function populate(body) {
    let status = utils.getDefaultIfNeeded(body.status, Enum.Status.activated);

    var data = {
        source_application: body.source_application,
        target_application: body.target_application,
        desc: body.desc,
        status: status,
    };

    return utils.cleanObject(data);
}

