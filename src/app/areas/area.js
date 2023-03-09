'use strict';

let mongoose = require('mongoose');
let Enum = require('../../enums');
let Schema = mongoose.Schema;

let schema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    business_owner: {
        type: String,
        required: true,
        trim: true
    },
    desc: {
        type: String,
        required: false,
        trim: true
    },
    status: {
        type: String,
        enum: Object.values(Enum.Status),
        default: Enum.Status.activated
    },
},
    { timestamps: true });

module.exports = mongoose.model('Area', schema);