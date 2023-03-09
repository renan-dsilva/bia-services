'use strict';

let authService = require('../../services/auth-service');
let mongoose = require('mongoose');
let Enum = require('../../enums');
const Process = mongoose.model('Process');
exports.model = Process
let utils = require('../../services/utils-service');

let fillable = exports.fillable = (fillable = null) => {
    return fillable || 'area name desc status';
}

exports.create = async (data) => {
    let query = authService.buildQuery(data);
    let source = new Process(query);
    await source.save();

    return source;
}

exports.update = async (id, data) => {
    data = utils.cleanObject(data);

    let query = authService.buildQuery({ _id: id });
    let res = await Process.findOne(query);

    if (res != null) {
        let source = await Process
            .findByIdAndUpdate(id,
                { $set: data },
                { new: true })
            .populate('area')
            .sort('name');

        return source;
    }
}

exports.delete = async (id) => {
    let response = await Process.findByIdAndUpdate(id,
        { status: Enum.Status.deleted });

    return response;
}

exports.getById = async (id) => {
    let res = await Process.findById(id);
    return res;
}

exports.get = async () => {
    let query = authService.buildQuery({ status: { $ne: Enum.Status.deleted } });
    let res = await Process.find(query, fillable())
        .populate('area')
        .sort('name');

    return res;
}

exports.getByName = async (name) => {
    let value = new RegExp('^.*' + name.eregLatin().replace(/\s+/g, "\\s+") + '.*$', "i");
    let query = authService.buildQuery({ name: value });
    let res = await Process.find(query, fillable());


    return res;
}

exports.deleteAllHard = async (school) => {
    try {
        let query = { school: school };
        let qty = await Process.countDocuments(query)
        await Process.deleteMany(query);

        return qty;
    } catch (e) {
        console.error(e);
    }
}