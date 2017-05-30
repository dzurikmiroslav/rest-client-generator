'use sctrict';

var _ = require('lodash');
var request = require("request");
var fs = require('fs');

const urlRegExp = /^http[s]?.*$/;

function format(value, capitalize) {
    value = value.replace(/\W/g, '');
    if (capitalize) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
}


function fetchFile(filePath) {
    return new Promise(function (resolve, reject) {
        if (urlRegExp.test(filePath)) {
            request(filePath, function (err, res, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        } else {
            fs.readFile(filePath, 'utf8', function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        }
    }.bind(this));
}

module.exports.format = format;
module.exports.urlRegExp = urlRegExp;
module.exports.fetchFile = fetchFile;
