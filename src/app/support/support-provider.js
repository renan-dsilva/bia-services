'use strict';

let authService = require('../../services/auth-service');
let mongoose = require('mongoose');
let Enum = require('../../enums');
const Support = mongoose.model('Support');
exports.model = Support
let utils = require('../../services/utils-service');

let fillable = exports.fillable = (fillable = null) => {
    return fillable || 'name desc level phones emails status';
}

exports.create = async (data) => {
    let query = authService.buildQuery(data);
    let source = new Support(query);
    await source.save();

    return source;
}

exports.update = async (id, data) => {
    data = utils.cleanObject(data);

    let query = authService.buildQuery({ _id: id });
    let res = await Support.findOne(query);

    if (res != null) {
        let source = await Support
            .findByIdAndUpdate(id,
                { $set: data },
                { new: true })
            .sort('name');

        return source;
    }
}

exports.delete = async (id) => {
    let response = await Support.findByIdAndUpdate(id,
        { status: Enum.Status.deleted });

    return response;
}

exports.getById = async (id) => {
    let res = await Support.findById(id);
    return res;
}

exports.get = async () => {
    let query = authService.buildQuery({ status: { $ne: Enum.Status.deleted } });
    let res = await Support.find(query, fillable())
        .sort('name');

    return res;
}

exports.getByName = async (name) => {
    let value = new RegExp('^.*' + name.eregLatin().replace(/\s+/g, "\\s+") + '.*$', "i");
    let query = authService.buildQuery({ name: value });
    let res = await Support.find(query, fillable());


    return res;
}

exports.deleteAllHard = async (school) => {
    try {
        let query = { school: school };
        let qty = await Support.countDocuments(query)
        await Support.deleteMany(query);

        return qty;
    } catch (e) {
        console.error(e);
    }
}