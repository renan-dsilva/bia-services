let mongoose = require('mongoose');
let Enum = require('../enums');
let utils = require('./utils-service');
let fs = require("fs");
let path = require('path');
let request = require('request');
let moment = require("moment");
var shell = require('shelljs');
var latin = require('./latin-map');

// **** Remove Special Characters **** //

var Latinise = {};
Latinise.latin_map = latin.latinMap;
Latinise.accents_map = latin.accentsMap;

String.prototype.eregLatin = function () {
    return this.eregReservedCharacters().replace(/[A-Za-z0-9 ]/g, function (a) {
        return (typeof Latinise.accents_map[a] !== 'undefined') ? '[' + Latinise.accents_map[a] + ']' : a
    }
    );
};
String.prototype.eregReservedCharacters = function () {
    return this.replace(/[\.\*\+\?\|\(\)\[\]\{\} ]/g, function (a) {
        return (typeof Latinise.accents_map[a] !== 'undefined') ? Latinise.accents_map[a] : a
    }
    );
};
String.prototype.latinise = function () { return this.replace(/[^A-Za-z0-9\[\] ]/g, function (a) { return Latinise.latin_map[a] || a }) };
String.prototype.latinize = String.prototype.latinise;
String.prototype.isLatin = function () { return this == this.latinise() }



// **** Array Equals **** //

if (Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });


// **** Relationship **** //

if (String.prototype.belongsToMany || String.prototype.belongsToMany)
    console.warn("Overriding existing Array.prototype.belongsToMany. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");


String.prototype.removeManyRelationship = async function (model, manyName) {
    const scheme = mongoose.model(manyName); exports.model = scheme;
    if (model != null) {
        let items = await scheme.find({ [this]: model._id });
        await utils.asyncForEach(items, async (item) => {
            await scheme.findByIdAndUpdate(item._id, { $pull: { [this]: model._id } });
        });
    }
}

String.prototype.removeOneRelationship = async function (model, oneName) {
    const scheme = mongoose.model(oneName); exports.model = scheme;
    if (model != null) {
        let items = await scheme.find({ [this]: model._id });
        await utils.asyncForEach(items, async (item) => {
            await scheme.findByIdAndUpdate(item._id, { [this]: null });
        });
    }
}

String.prototype.belongsToMany = async function (model, many, manyName) {

    const scheme = mongoose.model(manyName); exports.model = scheme;
    if (model != null && many != null) {
        await this.removeManyRelationship(model, manyName);
        await utils.asyncForEach(many, async (item) => {
            await scheme.findByIdAndUpdate(
                item._id,
                { $addToSet: { [this]: model._id } },
            );
        });
    }
}

String.prototype.belongsToOne = async function (model, one, oneName) {
    const scheme = mongoose.model(oneName); exports.model = scheme;
    if (model != null) {
        await this.removeOneRelationship(model, oneName);
        await scheme.findByIdAndUpdate(
            one._id,
            { [this]: model._id }
        );
    }
}

String.prototype.removeManyRelationshipCascade = async function (model, manyName) {
    const scheme = mongoose.model(manyName); exports.model = scheme;
    var entity = this;
    if (model.id != null) {
        var items = await scheme.find({ [entity]: model.id });
        if (items.length == 0) {
            if (entity.substr(entity.length - 1) == 's') {
                entity = entity.slice(0, -1);
                items = await scheme.find({ [entity]: model.id });
            }
        }

        await utils.asyncForEach(items, async (item) => {
            await scheme.findByIdAndUpdate(item.id, { status: Enum.Status.deleted });
        });
    }
}



// **** Dates **** //

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

Date.prototype.toUserLocale = function (offset) {
    this.setMinutes(this.getMinutes() + offset);
}

Array.prototype.parseDatestoUserLocale = function (offset) {
    let map = this;
    map.forEach((src) => {
        var obj = src;
        if (src.hasOwnProperty('_doc')) {
            obj = src.toObject();
        }

        Object.keys(obj).forEach(function (key) {
            if (key.includes('date') || key.includes('updated') || key.includes('period_')) {
                let item = utils.getDefaultIfNeeded(src[key], new Date());
                item.toUserLocale(offset);
            }
        });

    });
}

// **** Files **** //

String.prototype.fileExists = function () {
    let root = path.dirname(require.main.filename || process.mainModule.filename);
    let fullPath = root + this;

    return fs.existsSync(fullPath);
}


// **** Sum property value in an array **** //

Array.prototype.sum = function (property) {
    var total = 0
    for (var i = 0, _len = this.length; i < _len; i++) {
        total += utils.getDefaultIfNeeded(this[i][property], 0)
    }
    return total
}

Array.prototype.sumWithCondition = function (property, property_condition, value_condition) {
    var total = 0
    for (var i = 0, _len = this.length; i < _len; i++) {
        if (property_condition && value_condition) {
            if (typeof this[i][property_condition] !== 'undefined') {
                if (this[i][property_condition] == value_condition) {
                    total += utils.getDefaultIfNeeded(this[i][property], 0)
                }
            }
        } else {
            total += utils.getDefaultIfNeeded(this[i][property], 0)
        }
    }
    return total
}

Array.prototype.countWithCondition = function (property, value) {
    var total = 0
    for (var i = 0, _len = this.length; i < _len; i++) {
        if (property && value) {
            if (typeof this[i][property] !== 'undefined') {
                if (this[i][property] == value) {
                    total += 1
                }
            }
        }
    }
    return total
}


// **** Get names **** //

const snakeCase = string => {
    return string.replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('-');
};

String.prototype.tokenize = function (join = '-') {
    return this.replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join(join);
}

String.prototype.ucWords = function () {
    let str = this.toLowerCase().trim()
    let re = /(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g
    return str.replace(re, s => s.toUpperCase())
}

String.prototype.firstName = function () {
    if (!this.includes(' ')) {
        return this;
    }

    let names = this.split(' ');
    return names[0].ucWords();
}

String.prototype.firstLastName = function () {
    if (!this.includes(' ')) {
        return this;
    }

    let names = this.split(' ');
    let name = names[0] + ' ' + names[names.length - 1];

    return name.ucWords();
}

String.prototype.lastName = function () {
    if (!this.includes(' ')) {
        return this;
    }

    let names = this.split(' ');
    names.shift();

    return names.join(' ').ucWords();
}

String.prototype.shortener = function (limit = 50, textComplete = '...') {
    if (this == null || this == '') {
        return '';
    }

    limit = this.length < limit ? this.length : limit;
    var newList = this.substring(0, limit);
    newList += this.length > limit ? textComplete : '';

    return newList;
}


// **** Get ID from object **** //

String.prototype.getId = function () {
    if (this.id != null) {
        return this.id;
    }

    if (this._id != null) {
        return this._id;
    }

    return this;
}

// Object.prototype.clean = function () {
//     let obj = this;
//     for (let key in obj) {
//         if (obj[key] === null || obj[key] === undefined) {
//             delete obj[key];
//         }
//     }

//     return obj
// }


// **** Numbers **** //

String.prototype.currency = function (decPlaces = 2, decSep = ',', thouSep = '.') {
    const number = this;
    decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces,
        decSep = typeof decSep === "undefined" ? "." : decSep;
    thouSep = typeof thouSep === "undefined" ? "," : thouSep;
    var sign = number < 0 ? "-" : "";
    var i = String(parseInt(number = Math.abs(Number(number) || 0).toFixed(decPlaces)));
    var j = (j = i.length) > 3 ? j % 3 : 0;

    return sign +
        (j ? i.substr(0, j) + thouSep : "") +
        i.substr(j).replace(/(\decSep{3})(?=\decSep)/g, "$1" + thouSep) +
        (decPlaces ? decSep + Math.abs(number - i).toFixed(decPlaces).slice(2) : "");
}
