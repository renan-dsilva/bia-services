'use strict';

let authService = require('../../services/auth-service');
let mongoose = require('mongoose');
let Enum = require('../../enums');
const Integration = mongoose.model('Integration');
exports.model = Integration
let utils = require('../../services/utils-service');

let fillable = exports.fillable = (fillable = null) => {
    return fillable || 'source_application target_application desc status';
}

exports.create = async (data) => {
    let query = authService.buildQuery(data);
    let source = new Integration(query);
    await source.save();

    return source;
}

exports.update = async (id, data) => {
    data = utils.cleanObject(data);

    let query = authService.buildQuery({ _id: id });
    let res = await Integration.findOne(query);

    if (res != null) {
        let source = await Integration
            .findByIdAndUpdate(id,
                { $set: data },
                { new: true })
            .populate('source_application')
            .populate('target_application')
            .sort('name');

        return source;
    }
}

exports.delete = async (id) => {
    let response = await Integration.findByIdAndUpdate(id,
        { status: Enum.Status.deleted });

    return response;
}

exports.getById = async (id) => {
    let res = await Integration.findById(id);
    return res;
}

exports.get = async () => {
    let query = authService.buildQuery({ status: { $ne: Enum.Status.deleted } });
    let res = await Integration.find(query, fillable())
        .populate('source_application')
        .populate('target_application')
        .sort('name');

    return res;
}

exports.getByName = async (name) => {
    let value = new RegExp('^.*' + name.eregLatin().replace(/\s+/g, "\\s+") + '.*$', "i");
    let query = authService.buildQuery({ name: value });
    let res = await Integration.find(query, fillable());


    return res;
}

exports.getByApplication = async (application) => {
    let query = authService.buildQuery({ 
        $or: [
            { 'source_application': application }, 
            { 'target_application': application }
        ],
    })
    let res = await Integration.find(query, fillable())
        .populate('source_application')
    .populate('target_application');
;


    return res;
}

exports.deleteAllHard = async (school) => {
    try {
        let query = { school: school };
        let qty = await Integration.countDocuments(query)
        await Integration.deleteMany(query);

        return qty;
    } catch (e) {
        console.error(e);
    }
}