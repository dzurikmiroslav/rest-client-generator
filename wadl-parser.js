var fs = require('fs');
var path = require('path');
var xmldom = require('xmldom');
var xpath = require('xpath');

function WadlParser(wadlFile, defaultServiceName) {
    this.wadlFile = wadlFile;
    this.defaultServiceName = defaultServiceName;

    this.parser = new xmldom.DOMParser();
    this.select = xpath.useNamespaces({
        'ns': 'http://wadl.dev.java.net/2009/02',
        'xs': 'http://www.w3.org/2001/XMLSchema'
    });
}

WadlParser.prototype.parse = function() {
    var doc = this.parser.parseFromString(fs.readFileSync(this.wadlFile, 'utf8'));

    var types = [];
    this.select('//ns:application/ns:grammars/ns:include', doc).forEach(function(includeNode) {
        var xsdFile = path.join(path.dirname(this.wadlFile), includeNode.getAttribute('href'));
        var xsdDoc = this.parser.parseFromString(fs.readFileSync(xsdFile, 'utf8'));
        types = types.concat(this.parseGrammarSchema(xsdDoc.documentElement));
    }.bind(this));

    var serviceMap = {}
    this.select('//ns:application/ns:resources', doc).forEach(function(resourcesNode) {
        var urlPath = resourcesNode.getAttribute('base');
        this.select('ns:resource', resourcesNode).forEach(function(resourceNode) {
            this.readResource(resourceNode, urlPath, [], null, serviceMap);
        }.bind(this));
    }.bind(this));

    return {
        types: types,
        services: Object.keys(serviceMap).map(function(key) {
            return serviceMap[key];
        })
    }
};

WadlParser.prototype.parseGrammarSchema = function(schemaNode) {
    return this.select('xs:complexType|xs:simpleType', schemaNode).map(function(typeNode) {
        var type = {
            name: typeNode.getAttribute('name')
        };

        var elementNode = this.select('xs:element[@type="' + typeNode.getAttribute('name') + '"]', schemaNode)[0];
        if (elementNode) {
            type.id = elementNode.getAttribute('name');
        }

        if (typeNode.nodeName === 'xs:complexType') {
            type.type = 'class';
            type.fields = this.select('xs:sequence/xs:element', typeNode).map(function(elemNode) {
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

        return type;
    }.bind(this));
};

WadlParser.prototype.parseFieldElement = function(elementNode) {
    var type = elementNode.getAttribute('type');
    var basic = false;
    if (type.indexOf('xs:') === 0) {
        basic = true;
        type = getJsType(type);
    }

    var array = false;
    if (elementNode.hasAttribute('maxOccurs')) {
        array = elementNode.getAttribute('maxOccurs') !== '1';
    }

    return {
        name: elementNode.getAttribute('name'),
        type: type,
        basic: basic,
        array: array
    };
};

function getJsType(type) {
    switch (type) {
        case 'xs:string':
            return 'string';
        case 'xs:integer':
        case 'xs:int':
        case 'xs:float':
        case 'xs:double':
        case 'xs:numeric':
            return 'number';
        case 'xs:boolean':
            return 'boolean';
        case 'xs:dateTime':
            return 'Date';

        default:
            return 'Object'; //all others types
    }
}

WadlParser.prototype.readResource = function(resourceNode, parentUrlPath, parentUrlPathParams, parentName, serviceMap) {
    var name = parentName ? parentName : resourceNode.getAttribute('path').replace('/', '') || this.defaultServiceName;
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
            name: methodNode.getAttribute('id'),
            method: methodNode.getAttribute('name'),
            path: urlPath
        };

        if (urlPathParams.length) {
            method.pathParams = urlPathParams;
        }

        var requestResponseFunc = function(variant) {
            var node = this.select('ns:' + variant, methodNode)[0];
            if (node) {
                var paramNode = this.select('ns:param', node)[0];
                var representationNode = this.select('ns:representation', node)[0];

                if (paramNode) {
                    //TODO
                } else if (representationNode) {
                    method[variant + 'TypeId'] = representationNode.getAttribute('element');
                    method[variant + 'MediaType'] = representationNode.getAttribute('mediaType');
                }
            }
        }.bind(this);
        requestResponseFunc('request');
        requestResponseFunc('response');

        if (!serviceMap[name]) {
            serviceMap[name] = {
                name: name,
                methods: []
            };
        }
        serviceMap[name].methods.push(method);
    }.bind(this));

    this.select('ns:resource', resourceNode).forEach(function(resNode) {
        this.readResource(resNode, urlPath, urlPathParams, name, serviceMap);
    }.bind(this));
};


module.exports = function(options) {
    var parser = new WadlParser(options.wadlFile, options.defaultServiceName);
    return parser.parse();
};