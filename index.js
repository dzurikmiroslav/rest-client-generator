var wadlParser = require('./wadl-parser');

module.exports = function(options) {
  var opts = {
    wadlFile: 'application.wadl',
    outputFile: 'service.ts',
    platform: 'typescript-angular2', //[typescript-angular2 | dart-angular2 | typescript-dojo2]
    rootPath: '',
    defaultServiceName: '', //if first resource in WADL has method
    capitalize: true,
    serviceSuffix: 'Service'
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
