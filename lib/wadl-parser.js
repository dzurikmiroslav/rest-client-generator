var fs = require('fs');
var path = require('path');
var xmldom = require('xmldom');
var xpath = require('xpath');

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function WadlParser(options) {
    this.options = options;

    this.parser = new xmldom.DOMParser();
    this.select = xpath.useNamespaces({
        'ns': 'http://wadl.dev.java.net/2009/02',
        'xs': 'http://www.w3.org/2001/XMLSchema'
    });
}

WadlParser.prototype.parse = function() {
    var doc = this.parser.parseFromString(fs.readFileSync(this.options.wadlFile, 'utf8'));

    this.typesById = {};
    this.types = [];
    this.select('//ns:application/ns:grammars/ns:include', doc).forEach(function(includeNode) {
        var xsdFile = path.join(path.dirname(this.options.wadlFile), includeNode.getAttribute('href'));
        var xsdDoc = this.parser.parseFromString(fs.readFileSync(xsdFile, 'utf8'));
        this.parseGrammarSchema(xsdDoc.documentElement);
    }.bind(this));

    var rootUrl = null;
    var serviceMap = {};
    this.methodCounter = 0;
    this.select('//ns:application/ns:resources', doc).forEach(function(resourcesNode) {
        rootUrl = this.options.rootUrl || resourcesNode.getAttribute('base');
        this.select('ns:resource', resourcesNode).forEach(function(resourceNode) {
            this.readResource(resourceNode, '/', [], null, serviceMap);
        }.bind(this));
    }.bind(this));

    return {
        types: this.types,
        rootUrl: rootUrl,
        services: Object.keys(serviceMap).map(function(key) {
            return serviceMap[key];
        })
    }
};

WadlParser.prototype.parseGrammarSchema = function(schemaNode) {
    this.select('xs:complexType|xs:simpleType', schemaNode).forEach(function(typeNode) {
        var type = {
            name: this.options.capitalize ? capitalize(typeNode.getAttribute('name')) : typeNode.getAttribute('name')
        };

        var elementNode = this.select('xs:element[@type="' + typeNode.getAttribute('name') + '"]', schemaNode)[0];
        if (elementNode) {
            this.typesById[elementNode.getAttribute('name')] = type;
        }

        if (typeNode.nodeName === 'xs:complexType') {
            type.type = 'class';
            var extensionNode = this.select('xs:complexContent/xs:extension', typeNode)[0];
            if (extensionNode) {
                type.parent = this.options.capitalize ? capitalize(extensionNode.getAttribute('base')) : extensionNode.getAttribute('base');
            }
            type.fields = this.select('xs:sequence/xs:element|xs:complexContent/xs:extension/xs:sequence/xs:element', typeNode).map(function(elemNode) {
                return this.parseFieldElement(elemNode);
            }.bind(this));
        } else {
            var enumNodes = this.select('xs:restriction[@base="xs:string"]/xs:enumeration', typeNode);
            if (enumNodes) {
                type.type = 'enum';
                type.values = enumNodes.map(function(enumNode) {
                    return enumNode.getAttribute('value');
                }.bind(this));
            }
        }

        this.types.push(type);
    }.bind(this));
};

WadlParser.prototype.parseFieldElement = function(elementNode) {
    var type = elementNode.getAttribute('type');
    var basic = false;
    if (type.indexOf('xs:') === 0) {
        basic = true;
        type = getJsType(type);
    } else if (this.options.capitalize) {
        type = capitalize(type);
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
        name: elementNode.getAttribute('name'),
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

WadlParser.prototype.readResource = function(resourceNode, parentUrlPath, parentUrlPathParams, parentName, serviceMap) {
    var name = parentName ? parentName : resourceNode.getAttribute('path').replace('/', '') || this.options.defaultServiceName;

    var urlPath = parentUrlPath + resourceNode.getAttribute('path');
    var urlPathParams = this.select('ns:param[@style="template"]', resourceNode).map(function(param) {
        return {
            name: param.getAttribute('name'),
            type: getJsType(param.getAttribute('type'))
        };
    }.bind(this));
    urlPathParams.sort(function(a, b) {
        return urlPath.indexOf('{' + a.name + '}') - urlPath.indexOf('{' + b.name + '}');
    });
    urlPathParams = parentUrlPathParams.concat(urlPathParams);

    this.select('ns:method', resourceNode).forEach(function(methodNode) {
        var method = {
            name: methodNode.getAttribute('id') || 'method' + this.methodCounter++,
            method: methodNode.getAttribute('name'),
            path: urlPath.replace(/(\/)\/+/g, '$1')
        };

        if (urlPathParams.length) {
            method.pathParams = urlPathParams;
        }

        var requestResponseFunc = function(variant) {
            var node = this.select('ns:' + variant, methodNode)[0];
            if (node) {
                var representationNode = this.select('ns:representation', node)[0];

                var queryParams = this.select('ns:param[@style="query"]', node).map(function(param) {
                    return {
                        name: param.getAttribute('name'),
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

                    var formParams = this.select('ns:param[@style="query"]', representationNode).map(function(param) {
                        return {
                            name: param.getAttribute('name'),
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

        var serviceName = (this.options.capitalize ? capitalize(name) : name) + this.options.serviceSuffix;

        if (!serviceMap[serviceName]) {
            serviceMap[serviceName] = {
                name: serviceName,
                methods: []
            };
        }
        serviceMap[serviceName].methods.push(method);
    }.bind(this));

    this.select('ns:resource', resourceNode).forEach(function(resNode) {
        this.readResource(resNode, urlPath, urlPathParams, name, serviceMap);
    }.bind(this));
};


module.exports = function(options) {
    var parser = new WadlParser(options);
    return parser.parse();
};
