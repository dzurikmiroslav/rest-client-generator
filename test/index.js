var assert = require('assert');
var fs = require('fs');
var restClientGenerator = require('../');
var parser = require('../wadl-parser');

var outDir = __dirname + '/out';

var opts = {
  wadlFile: __dirname + '/application.wadl',
  outputFile: outDir + '/service.ts',
  platform: 'angular2-ts',
  rootUrl: 'localhost:8080',
  serviceSuffix: 'Service',
  capitalize: true,
  internalVariablePrefix: '_'
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

describe('wadl-parser', function() {
  it('should do something', function() {
    var meta = parser(opts);

    assert(meta);
    assert(meta.types);
    assert.equal(meta.rootUrl, opts.rootUrl);
    assert(meta.services);

    fs.writeFileSync(outDir + '/meta.json', JSON.stringify(meta, 1, 1), 'utf8');
  });
});

describe('wadl-client-generator', function() {
  it('should do something', function() {
    restClientGenerator(opts);

    var serviceSrc = fs.readFileSync(opts.outputFile, 'utf8');

    assert(serviceSrc);
  });
});
