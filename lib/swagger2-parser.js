'use strict';

var _ = require('lodash');
var util = require('./parser-util');
var path = require('path');
var yaml = require('js-yaml');

function Swagger2Parser(options) {
    this.options = options;
}

Swagger2Parser.prototype.parse = function () {
    return util.fetchFile(this.options.input)
        .then(function (swaggerContent) {
            this.types = [];
            this.services = {};

            var swaggerDef;
            if (this.options.input.endsWith('.json') || this.options.input.endsWith('.JSON')) {
                swaggerDef = JSON.parse(swaggerContent);
            } else if (this.options.input.endsWith('.yaml') || this.options.input.endsWith('.YAML')) {
                swaggerDef = yaml.load(swaggerContent);
            }

            this.parsePaths(swaggerDef);
            this.parseDefinitions(swaggerDef);

            var rootUrl = null;
            if (this.options.rootUrl) {
                rootUrl = this.options.rootUrl;
            } else if (swaggerDef.host && swaggerDef.basePath) {
                rootUrl = path.join(swaggerDef.host, swaggerDef.basePath);
            }

            return {
                rootUrl: rootUrl,
                services: _.values(this.services),
                types: this.types
            };
        }.bind(this));
};

Swagger2Parser.prototype.parsePaths = function (swaggerDef) {
    _.forEach(swaggerDef.paths, function (pathDef, pathKey) {
        _.forEach(pathDef, function (methodDef, methodKey) {
            var method = this.parseMethod(methodDef, methodKey, pathKey);

            methodDef.tags.every(function (tag) {
                var serviceName = util.format(tag.replace(this.options.serviceExclude, ''), this.options.capitalize) + this.options.serviceSuffix;

                if (!this.services[serviceName]) {
                    this.services[serviceName] = {
                        name: serviceName,
                        methods: []
                    };
                }
                this.services[serviceName].methods.push(method);
            }.bind(this));
        }.bind(this));
    }.bind(this));
};

Swagger2Parser.prototype.parseMethod = function (methodDef, httpMethod, path) {
    var method = {
        method: httpMethod.toUpperCase(),
        name: util.format(methodDef.operationId.replace(this.options.methodExclude, ''), false),
        path: path
    };

    if (methodDef.consumes) {
        method.requestMediaType = methodDef.consumes[0]; // support only single media type
    }
    if (methodDef.produces) {
        method.responseMediaType = methodDef.produces[0]; // support only single media type
    }

    var paramDef = _.find(methodDef.parameters, _.matchesProperty('in', 'body'));
    if (paramDef) {
        method.requestType = getType(paramDef.schema.$ref, this.options.capitalize);
    }

    var parmsDef = _.filter(methodDef.parameters, _.matchesProperty('in', 'query'));
    if (parmsDef.length) {
        method.queryParams = _.map(parmsDef, function (paramDef) {
            return {
                name: paramDef.name,
                type: getJsType(paramDef) // array not supported
            };
        });
    }

    parmsDef = _.filter(methodDef.parameters, _.matchesProperty('in', 'formData'));
    if (parmsDef.length) {
        method.formParams = _.map(parmsDef, function (paramDef) {
            return {
                name: paramDef.name,
                type: getJsType(paramDef)  // array not supported
            };
        });
    }

    parmsDef = _.filter(methodDef.parameters, _.matchesProperty('in', 'path'));
    if (parmsDef.length) {
        method.pathParams = _.map(parmsDef, function (paramDef) {
            return {
                name: paramDef.name,
                type: getJsType(paramDef)  // array not supported
            };
        });
    }

    if (_.has(methodDef, 'responses.200.schema.$ref')) {
        method.responseType = getType(methodDef.responses['200'].schema.$ref, this.options.capitalize);
    }

    return method;
};

Swagger2Parser.prototype.parseDefinitions = function (swaggerDef) {
    this.types = _.map(swaggerDef.definitions, function (typeDef, typeKey) {
        return {
            type: 'class',
            name: util.format(typeKey, this.options.capitalize),
            fields: _.map(typeDef.properties, function (propDef, propKey) {
                var array = false;
                var type;

                if (propDef.enum) {
                    type = '(\'' + propDef.enum.join('\' | \'') + '\')';
                } else if (propDef.type) {
                    if (propDef.type === 'array') {
                        array = true;
                        if (propDef.items.type) {
                            if (propDef.items.enum) {
                                type = '(\'' + propDef.items.enum.join('\' | \'') + '\')';
                            } else {
                                type = getJsType(propDef.items.type);
                            }
                        } else {
                            type = getType(propDef.items.$ref, this.options.capitalize);
                        }
                    } else {
                        type = getJsType(propDef);
                    }
                } else if (propDef.$ref) {
                    type = getType(propDef.$ref, this.options.capitalize);
                } else {
                    type = 'Object';
                }

                return {
                    name: propKey,
                    type: type,
                    optional: !typeDef.required || typeDef.required.indexOf(propKey) === -1,
                    array: array
                };
            }.bind(this))
        };
    }.bind(this));
};

function getJsType(definition) {
    switch (definition.type) {
        case 'string':
            return (definition.format === 'date' || definition.format === 'date-time') ? 'Date' : 'string';
        case 'number':
        case 'integer':
            return 'number';
        case 'boolean':
            return 'boolean';
        default:
            return 'Object'; // all others types
    }
}

function getType(definition, capitalize) {
    return util.format(definition.replace('#/definitions/', ''), capitalize);
}

module.exports = function (options) {
    var parser = new Swagger2Parser(options);
    return parser.parse();
};
