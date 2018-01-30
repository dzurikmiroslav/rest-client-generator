'use strict';

var _ = require('lodash');
var path = require('path');
var url = require('url');
var xmldom = require('xmldom');
var xpath = require('xpath');
var request = require('request');
var util = require('./parser-util');

function WadlParser(options) {
    this.options = options;

    this.parser = new xmldom.DOMParser();
    this.select = xpath.useNamespaces({
        'ns': 'http://wadl.dev.java.net/2009/02',
        'xs': 'http://www.w3.org/2001/XMLSchema'
    });
}

WadlParser.prototype.parse = function () {
    return util.fetchFile(this.options.input)
        .then(function (wadlContent) {
            var doc = this.parser.parseFromString(wadlContent);

            this.services = {};
            this.methodCounter = 0;
            this.types = {};

            return Promise.all(
                this.select('//ns:application/ns:grammars/ns:include', doc).map(function (includeNode) {
                    var xsdFilePath;
                    if (util.urlRegExp.test(this.options.input)) {
                        var xsdUrl = url.parse(this.options.input);
                        xsdUrl.pathname = path.join(path.dirname(xsdUrl.pathname), includeNode.getAttribute('href'));
                        xsdFilePath = url.format(xsdUrl);
                    } else {
                        xsdFilePath = path.join(path.dirname(this.options.input), includeNode.getAttribute('href'));
                    }

                    return util.fetchFile(xsdFilePath).then(function (xsdContent) {
                        var xsdDoc = this.parser.parseFromString(xsdContent);
                        this.parseGrammarSchema(xsdDoc.documentElement);
                    }.bind(this));
                }.bind(this)))
                .then(function () {
                    var rootUrl = null;

                    this.select('//ns:application/ns:resources', doc).forEach(function (resourcesNode) {
                        rootUrl = this.options.rootUrl || resourcesNode.getAttribute('base');
                        this.select('ns:resource', resourcesNode).forEach(function (resourceNode) {
                            this.readResource(resourceNode, '/', [], null);
                        }.bind(this));
                    }.bind(this));

                    return {
                        rootUrl: rootUrl,
                        services: _.values(this.services),
                        types: _.values(this.types)
                    };
                }.bind(this));
        }.bind(this));
};

WadlParser.prototype.parseGrammarSchema = function (schemaNode) {
    this.select('xs:complexType|xs:simpleType', schemaNode).forEach(function (typeNode) {
        var type = {
            name: util.format(typeNode.getAttribute('name'), this.options.capitalize)
        };

        var elementNode = this.select('xs:element[@type="' + typeNode.getAttribute('name') + '"]', schemaNode)[0];
        if (elementNode) {
            this.types[elementNode.getAttribute('name')] = type;
        } else {
            this.types[_.size(this.types)] = type;
        }

        if (typeNode.nodeName === 'xs:complexType') {
            type.type = 'class';
            var extensionNode = this.select('xs:complexContent/xs:extension', typeNode)[0];
            if (extensionNode) {
                type.parent = util.format(extensionNode.getAttribute('base'), this.options.capitalize);
            }
            type.fields = _.concat(
                this.select('xs:sequence/xs:element|xs:complexContent/xs:extension/xs:sequence/xs:element', typeNode).map(function (elemNode) {
                    return this.parseFieldElement(elemNode);
                }.bind(this)),
                this.select('xs:attribute', typeNode).map(function (attributeNode) {
                    return this.parseFieldAttribute(attributeNode);
                }.bind(this))
            );
        } else {
            var enumNodes = this.select('xs:restriction[@base="xs:string"]/xs:enumeration', typeNode);
            if (enumNodes) {
                type.type = 'enum';
                type.values = enumNodes.map(function (enumNode) {
                    return enumNode.getAttribute('value');
                }.bind(this));
            }
        }
    }.bind(this));
};

WadlParser.prototype.parseFieldElement = function (elementNode) {
    var type = elementNode.getAttribute('type');
    if (type.indexOf('xs:') === 0) {
        type = getJsType(type);
    } else {
        type = util.format(type, this.options.capitalize);
    }

    var optional = false;
    if (elementNode.hasAttribute('minOccurs')) {
        optional = elementNode.getAttribute('minOccurs') === '0';
    }

    var array = false;
    if (elementNode.hasAttribute('maxOccurs')) {
        array = elementNode.getAttribute('maxOccurs') !== '1';
    }

    return {
        name: util.format(elementNode.getAttribute('name'), false),
        type: type,
        optional: optional,
        array: array
    };
};

WadlParser.prototype.parseFieldAttribute = function (attributeNode) {
    var type = attributeNode.getAttribute('type');
    if (type.indexOf('xs:') === 0) {
        type = getJsType(type);
    } else {
        type = util.format(type, this.options.capitalize);
    }

    var optional = true;
    if (attributeNode.hasAttribute('use')) {
        optional = attributeNode.getAttribute('use') !== 'required';
    }

    return {
        name: util.format(attributeNode.getAttribute('name'), false),
        type: type,
        optional: optional,
        array: false
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

WadlParser.prototype.readResource = function (resourceNode, parentUrlPath, parentUrlPathParams, parentName) {
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
            name: util.format(methodNode.getAttribute('id') || 'method' + this.methodCounter++, false),
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
                        name: util.format(param.getAttribute('name'), false),
                        type: getJsType(param.getAttribute('type'))
                    };
                });
                if (queryParams.length) {
                    method.queryParams = queryParams; //response haven't query parameters
                }

                if (representationNode) {
                    var type = this.types[representationNode.getAttribute('element')];
                    if (type) {
                        method[variant + 'Type'] = type.name;
                    }
                    var mediaType = representationNode.getAttribute('mediaType');
                    method[variant + 'MediaType'] = mediaType;

                    var formParams = this.select('ns:param[@style="query"]', representationNode).map(function (param) {
                        return {
                            name: util.format(param.getAttribute('name'), false),
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

        var serviceName = util.format(name, this.options.capitalize) + this.options.serviceSuffix;

        if (!this.services[serviceName]) {
            this.services[serviceName] = {
                name: serviceName,
                methods: []
            };
        }
        this.services[serviceName].methods.push(method);
    }.bind(this));

    this.select('ns:resource', resourceNode).forEach(function (resNode) {
        this.readResource(resNode, urlPath, urlPathParams, name);
    }.bind(this));
};


module.exports = function (options) {
    var parser = new WadlParser(options);
    return parser.parse();
};
