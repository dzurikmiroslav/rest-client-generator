'use strict';

var wadlParser = require('./wadl-parser');
var swagger2Parser = require('./swagger2-parser');

module.exports = function (options) {
    var opts = {
        input: '',
        outputFile: 'services.ts',
        platform: 'angular6-ts', //[angular6-ts | angular5-ts | angular2-ts | angular2-dart | dojo2-ts]
        rootUrl: '',
        defaultServiceName: '',
        capitalize: true,
        serviceSuffix: 'Service',
        serviceExclude: '',
        methodExclude: '',
        moduleName: 'ServiceModule',
        internalVariablePrefix: '_'
    };

    for (var opt in opts) {
        if (options[opt] !== undefined) {
            opts[opt] = options[opt];
        }
    }

    var metaPromise;

    if (opts.input.endsWith('.wadl')) {
        console.log('Reading WADL from %s', opts.input);
        metaPromise = wadlParser(opts);
    } else {
        console.log('Reading Swagger from %s', opts.input);
        metaPromise = swagger2Parser(opts);
    }

    return metaPromise.then(function (meta) {
        console.log('Definition successfully parsed, found %d services', meta.services.length);

        console.log('Generating sources for platform %s', opts.platform);
        var serializer = require('./serializer/' + opts.platform);
        serializer(meta, opts);

        console.log('REST client was successfully generated to %s', opts.outputFile);
    }, function (err) {
        console.log(err);
    });
};
