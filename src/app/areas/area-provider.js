'use strict';

let authService = require('../../services/auth-service');
let mongoose = require('mongoose');
let Enum = require('../../enums');
const Area = mongoose.model('Area');
exports.model = Area
let utils = require('../../services/utils-service');

let fillable = exports.fillable = (fillable = null) => {
    return fillable || 'business_owner name desc status';
}

exports.create = async (data) => {
    let query = authService.buildQuery(data);
    let source = new Area(query);
    await source.save();

    return source;
}

exports.update = async (id, data) => {
    data = utils.cleanObject(data);

    let query = authService.buildQuery({ _id: id });
    let res = await Area.findOne(query);

    if (res != null) {
        let source = await Area
            .findByIdAndUpdate(id,
                { $set: data },
                { new: true })
            .sort('name');

        return source;
    }
}

exports.delete = async (id) => {
    let response = await Area.findByIdAndUpdate(id,
        { status: Enum.Status.deleted });

    return response;
}

exports.getById = async (id) => {
    let res = await Area.findById(id);
    return res;
}

exports.get = async () => {
    let query = authService.buildQuery({ status: { $ne: Enum.Status.deleted } })
    let res = await Area.find(query, fillable())
        .sort('name');

    return res;
}

exports.getByName = async (name) => {
    let value = new RegExp('^.*' + name.eregLatin().replace(/\s+/g, "\\s+") + '.*$', "i");
    let query = authService.buildQuery({ name: value });
    let res = await Area.find(query, fillable());


    return res;
}

exports.deleteAllHard = async (school) => {
    try {
        let query = { school: school };
        let qty = await Area.countDocuments(query)
        await Area.deleteMany(query);

        return qty;
    } catch (e) {
        console.error(e);
    }
}