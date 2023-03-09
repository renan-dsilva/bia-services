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
    desc: {
        type: String,
        required: true,
        trim: true
    },
    level: {
        type: Number,
        required: true
    },
    phones: [{
        type: String,
        required: [true, 'Pelo menos um telefone deve ser informado']
    }],
    emails: [{
        type: String,
        required: [true, 'Pelo menos um email deve ser informado']
    }],
    status: {
        type: String,
        enum: Object.values(Enum.Status),
        default: Enum.Status.activated
    },
},
    { timestamps: true });

module.exports = mongoose.model('Support', schema);