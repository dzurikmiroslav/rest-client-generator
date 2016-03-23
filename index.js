var fs = require('fs');
var wadlParser = require('./wadl-parser');

module.exports = function(options) {
  var opts = {
    wadlFile: 'application.wadl',
    outputFile: 'service.ts',
    language: 'typescript', //typescript | dart
    framework: 'angular2', //angular2 | dojo2
    rootPath: '',
    defaultServiceName: 'Service' //if first resource has method
  };

  if (options) {
    for (var opt in options) {
      opts[opt] = options[opt];
    }
  }

  var serializer = require('./serializer/' + opts.language + '-' + opts.framework);

  var meta = wadlParser(opts);

  serializer(meta, opts);
};
