'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');
var xmldom = require('xmldom');
var xpath = require('xpath');
var request = require("request");


var urlRegExp = /^http[s]?.*$/;

function format(value, capitalize) {
    value = value.replace(/\W/g, '');
    if (capitalize) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
}

function WadlParser(options) {
    this.options = options;

    this.parser = new xmldom.DOMParser();
    this.select = xpath.useNamespaces({
        'ns': 'http://wadl.dev.java.net/2009/02',
        'xs': 'http://www.w3.org/2001/XMLSchema'
    });
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

WadlParser.prototype.parse = function () {
    return fetchFile(this.options.wadl)
        .then(function (wadlContent) {
            var doc = this.parser.parseFromString(wadlContent);

            this.typesById = {};
            this.types = [];

            return Promise.all(
                this.select('//ns:application/ns:grammars/ns:include', doc).map(function (includeNode) {
                    var xsdFilePath;
                    if (urlRegExp.test(this.options.wadl)) {
                        var xsdUrl = url.parse(this.options.wadl);
                        xsdUrl.pathname = path.join(path.dirname(xsdUrl.pathname), includeNode.getAttribute('href'));
                        xsdFilePath = url.format(xsdUrl);
                    } else {
                        xsdFilePath = path.join(path.dirname(this.options.wadl), includeNode.getAttribute('href'));
                    }

                    return fetchFile(xsdFilePath).then(function (xsdContent) {
                        var xsdDoc = this.parser.parseFromString(xsdContent);
                        this.parseGrammarSchema(xsdDoc.documentElement);
                    }.bind(this));
                }.bind(this)))
                .then(function () {
                    var rootUrl = null;
                    var serviceMap = {};
                    this.methodCounter = 0;
                    this.select('//ns:application/ns:resources', doc).forEach(function (resourcesNode) {
                        rootUrl = this.options.rootUrl || resourcesNode.getAttribute('base');
                        this.select('ns:resource', resourcesNode).forEach(function (resourceNode) {
                            this.readResource(resourceNode, '/', [], null, serviceMap);
                        }.bind(this));
                    }.bind(this));

                    return {
                        types: this.types,
                        rootUrl: rootUrl,
                        services: Object.keys(serviceMap).map(function (key) {
                            return serviceMap[key];
                        })
                    };
                }.bind(this));
        }.bind(this));
};

WadlParser.prototype.parseGrammarSchema = function (schemaNode) {
    this.select('xs:complexType|xs:simpleType', schemaNode).forEach(function (typeNode) {
        var type = {
            name: format(typeNode.getAttribute('name'), this.options.capitalize)
        };

        var elementNode = this.select('xs:element[@type="' + typeNode.getAttribute('name') + '"]', schemaNode)[0];
        if (elementNode) {
            this.typesById[elementNode.getAttribute('name')] = type;
        }

        if (typeNode.nodeName === 'xs:complexType') {
            type.type = 'class';
            var extensionNode = this.select('xs:complexContent/xs:extension', typeNode)[0];
            if (extensionNode) {
                type.parent = format(extensionNode.getAttribute('base'), this.options.capitalize);
            }
            type.fields = this.select('xs:sequence/xs:element|xs:complexContent/xs:extension/xs:sequence/xs:element', typeNode).map(function (elemNode) {
                return this.parseFieldElement(elemNode);
            }.bind(this));
        } else {
            var enumNodes = this.select('xs:restriction[@base="xs:string"]/xs:enumeration', typeNode);
            if (enumNodes) {
                type.type = 'enum';
                type.values = enumNodes.map(function (enumNode) {
                    return enumNode.getAttribute('value');
                }.bind(this));
            }
        }

        this.types.push(type);
    }.bind(this));
};

WadlParser.prototype.parseFieldElement = function (elementNode) {
    var type = elementNode.getAttribute('type');
    var basic = false;
    if (type.indexOf('xs:') === 0) {
        basic = true;
        type = getJsType(type);
    }
    type = format(type, this.options.capitalize);

    var optional = false;
    if (elementNode.hasAttribute('minOccurs')) {
        optional = elementNode.getAttribute('minOccurs') === '0';
    }

    var array = false;
    if (elementNode.hasAttribute('maxOccurs')) {
        array = elementNode.getAttribute('maxOccurs') !== '1';
    }

    return {
        name: format(elementNode.getAttribute('name'), false),
        type: type,
        basic: basic,
        optional: optional,
        array: array
    };
};

function getJsType(type) {
    switch (type) {
        case 'xs:string':
        case 'xs:normalizedString':
            return 'string';
        case 'xs:byte':
        case 'xs:short':
        case 'xs:int':
        case 'xs:long':
        case 'xs:integer':
        case 'xs:float':
        case 'xs:double':
        case 'xs:number':
        case 'xs:decimal':
        case 'xs:positiveInteger':
        case 'xs:nonPositiveInteger':
        case 'xs:negativeInteger':
        case 'xs:unsignedByte':
        case 'xs:unsignedShort':
        case 'xs:unsignedInt':
        case 'xs:unsignedLong':
            return 'number';
        case 'xs:boolean':
            return 'boolean';
        case 'xs:date':
        case 'xs:time':
        case 'xs:dateTime':
            return 'Date';
        default:
            return 'Object'; //all others types
    }
}

WadlParser.prototype.readResource = function (resourceNode, parentUrlPath, parentUrlPathParams, parentName, serviceMap) {
    var name = parentName ? parentName : resourceNode.getAttribute('path').replace('/', '') || this.options.defaultServiceName;

    var urlPath = parentUrlPath + resourceNode.getAttribute('path');
    var urlPathParams = this.select('ns:param[@style="template"]', resourceNode).map(function (param) {
        return {
            name: param.getAttribute('name'),
            type: getJsType(param.getAttribute('type'))
        };
    }.bind(this));
    urlPathParams.sort(function (a, b) {
        return urlPath.indexOf('{' + a.name + '}') - urlPath.indexOf('{' + b.name + '}');
    });
    urlPathParams = parentUrlPathParams.concat(urlPathParams);

    this.select('ns:method', resourceNode).forEach(function (methodNode) {
        var method = {
            name: format(methodNode.getAttribute('id') || 'method' + this.methodCounter++, false),
            method: methodNode.getAttribute('name'),
            path: urlPath.replace(/(\/)\/+/g, '$1')
        };

        if (urlPathParams.length) {
            method.pathParams = urlPathParams;
        }

        var requestResponseFunc = function (variant) {
            var node = this.select('ns:' + variant, methodNode)[0];
            if (node) {
                var representationNode = this.select('ns:representation', node)[0];

                var queryParams = this.select('ns:param[@style="query"]', node).map(function (param) {
                    return {
                        name: format(param.getAttribute('name'), false),
                        type: getJsType(param.getAttribute('type'))
                    };
                });
                if (queryParams.length) {
                    method.queryParams = queryParams; //response haven't query parameters
                }

                if (representationNode) {
                    var type = this.typesById[representationNode.getAttribute('element')];
                    if (type) {
                        method[variant + 'Type'] = type.name;
                    }
                    var mediaType = representationNode.getAttribute('mediaType');
                    method[variant + 'MediaType'] = mediaType

                    var formParams = this.select('ns:param[@style="query"]', representationNode).map(function (param) {
                        return {
                            name: format(param.getAttribute('name'), false),
                            type: getJsType(param.getAttribute('type'))
                        };
                    });
                    if (formParams.length) {
                        method.formParams = formParams; //response haven't form parameters
                    }
                }
            }
        }.bind(this);
        requestResponseFunc('request');
        requestResponseFunc('response');

        var serviceName = format(name, this.options.capitalize);

        if (!serviceMap[serviceName]) {
            serviceMap[serviceName] = {
                name: serviceName,
                methods: []
            };
        }
        serviceMap[serviceName].methods.push(method);
    }.bind(this));

    this.select('ns:resource', resourceNode).forEach(function (resNode) {
        this.readResource(resNode, urlPath, urlPathParams, name, serviceMap);
    }.bind(this));
};


module.exports = function (options) {
    var parser = new WadlParser(options);
    return parser.parse();
};
