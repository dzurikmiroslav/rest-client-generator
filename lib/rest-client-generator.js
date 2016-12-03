var wadlParser = require('./wadl-parser');

module.exports = function(options) {
    var opts = {
        wadlFile: '',
        outputFile: 'service.ts',
        platform: 'angular2-ts', //[angular2-ts | angular2-dart | dojo2-ts]
        rootUrl: '',
        defaultServiceName: '',
        capitalize: true,
        serviceSuffix: 'Service',
        internalVariablePrefix: '_'
    };

    for (var opt in opts) {
        if (options[opt] !== undefined) {
          opts[opt] = options[opt];
        }
    }

    var meta = wadlParser(opts);

console.log(opts);

    var serializer = require('./serializer/' + opts.platform);
    serializer(meta, opts);
};
