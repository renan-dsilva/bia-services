'use strict';

let mongoose = require('mongoose');
let Enum = require('../../enums');
let Schema = mongoose.Schema;

let schema = new Schema({
    processes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Process',
        required: [false]
    }],
    support: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Support',
        required: [false]
    }],
    name: {
        type: String,
        required: true,
        trim: true
    },
    desc: {
        type: String,
        required: true,
        trim: true
    },
    vendor: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: Object.values(Enum.Status),
        default: Enum.Status.activated
    },
},
    { timestamps: true });

module.exports = mongoose.model('Application', schema);