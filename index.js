var wadlParser = require('./wadl-parser');

module.exports = function(options) {
  var opts = {
    wadlFile: 'application.wadl',
    outputFile: 'service.ts',
    platform: 'angular2-ts', //[angular2-ts | angular2-dart | dojo2-ts]
    rootUrl: '',
    defaultServiceName: '', //if first resource in WADL has method
    capitalize: true,
    serviceSuffix: 'Service',
    internalVariablePrefix: '_'
  };

  if (options) {
    for (var opt in options) {
      opts[opt] = options[opt];
    }
  }

  var serializer = require('./serializer/' + opts.platform);

  var meta = wadlParser(opts);

  serializer(meta, opts);
};
