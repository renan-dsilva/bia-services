'use strict';

let authService = require('../../services/auth-service');
let mongoose = require('mongoose');
let Enum = require('../../enums');
const Application = mongoose.model('Application');
exports.model = Application
let utils = require('../../services/utils-service');
const entity = 'support';

let fillable = exports.fillable = (fillable = null) => {
    return fillable || 'support processes name desc vendor status';
}

exports.create = async (data) => {
    let query = authService.buildQuery(data);
    let model = new Application(query);
    const source = await model.save();
    await entity.belongsToMany(source, source.processes, 'Process');
    await entity.belongsToMany(source, source.support, 'Support');

    return source;
}

exports.update = async (id, data) => {
    data = utils.cleanObject(data);

    let query = authService.buildQuery({ _id: id });
    let res = await Application.findOne(query);

    if (res != null) {
        let source = await Application
            .findByIdAndUpdate(id,
                { $set: data },
                { new: true },
                async function (err, doc) {
                    if (err == null) {

                        if (typeof data['processes'] !== 'undefined') {
                            if (data['processes'] != null && data['processes'].length > 0) {
                                await entity.belongsToMany(doc, doc.processes, 'Process');
                            } else {
                                await entity.removeManyRelationship(doc, 'Process');
                            }
                        }
                        if (typeof data['support'] !== 'undefined') {
                            if (data['support'] != null && data['support'].length > 0) {
                                await entity.belongsToMany(doc, doc.support, 'Support');
                            } else {
                                await entity.removeManyRelationship(doc, 'Support');
                            }
                        }
                    }
                })
            .populate('processes')
            .populate('support')
            .sort('name');

        return source;
    }
}

exports.delete = async (id) => {
    let response = await Application.findByIdAndUpdate(id,
        { status: Enum.Status.deleted },
        async function (err, doc) {
            if (err == null) {
                await entity.removeManyRelationshipCascade(doc, 'Process');
                await entity.removeManyRelationshipCascade(doc, 'Support');
            }
        });

    return response;
}

exports.get = async () => {
    let query = authService.buildQuery({ status: { $ne: Enum.Status.deleted } });
    let res = await Application.find(query, fillable())
        .populate('processes')
        .populate('support')
        .sort('name');

    return res;
}

exports.getById = async (id) => {
    let res = await Application.findById(id)
        .populate('processes')
        .populate({
            path: 'processes',
            populate: {
              path: 'area',
              model: 'Area'
            }
          })
        .populate('support');
    return res;
}

exports.getByDoc = async (doc) => {
    let query = authService.buildQuery({ doc: doc, status: Enum.Status.activated });
    let res = await Application.findOne(query, fillable())
        .populate('processes')
        .populate('support');

    return res;
}

exports.getByName = async (name) => {
    let value = new RegExp('^.*' + name.eregLatin().replace(/\s+/g, "\\s+") + '.*$', "i");
    let query = authService.buildQuery({ name: value });
    let res = await Application.find(query, fillable())
        .populate('processes')
        .populate('support');

    return res;
}

exports.getByEmail = async (email) => {
    let query = authService.buildQuery({
        emails: new RegExp('^' + email + '$', "i"),
        status: Enum.Status.activated
    });

    let res = await Application
        .find(query, fillable())

    return res;
}

exports.deleteAllHard = async (school) => {
    try {
        let query = { school: school };
        let qty = await Application.countDocuments(query)
        await Application.deleteMany(query);

        return qty;
    } catch (e) {
        console.error(e);
    }
}