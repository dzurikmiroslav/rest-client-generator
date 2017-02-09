var wadlParser = require('./wadl-parser');

module.exports = function(options) {
    var opts = {
        wadlFile: '',
        outputFile: 'services.ts',
        platform: 'angular2-ts', //[angular2-ts | angular2-dart | dojo2-ts]
        rootUrl: '',
        defaultServiceName: '',
        capitalize: true,
        serviceSuffix: 'Service',
        moduleName: 'ServiceModule',
        internalVariablePrefix: '_'
    };

    for (var opt in opts) {
        if (options[opt] !== undefined) {
            opts[opt] = options[opt];
        }
    }

    console.log('Reading WADL from %s', opts.wadlFile);
    var meta = wadlParser(opts);
    console.log('WADL successfully parsed, found %d services', meta.services.length);

    console.log('Generating sources for platform %s', opts.platform);
    var serializer = require('./serializer/' + opts.platform);
    serializer(meta, opts);

    console.log('REST client was successfully generated to %s', opts.outputFile);
};
