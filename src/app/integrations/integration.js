'use strict';

let mongoose = require('mongoose');
let Enum = require('../../enums');
let Schema = mongoose.Schema;

let schema = new Schema({
    source_application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: [true, "The Source Application ID is required"]
    },
    target_application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: [true, "The Target Application ID is required"]
    },
    desc: {
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

module.exports = mongoose.model('Integration', schema);