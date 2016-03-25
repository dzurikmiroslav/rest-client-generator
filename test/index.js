var assert = require('assert');
var fs = require('fs');
var restClientGenerator = require('../');
var parser = require('../wadl-parser');

var outDir = __dirname + '/out';

var opts = {
  wadlFile: __dirname + '/application.wadl',
  outputFile: outDir + '/service.ts',
  platform: 'typescript-angular2',
  rootPath: './rest/',
  serviceSuffix: 'Service',
  capitalize: true
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

describe('wadl-parser', function() {
  it('should do something', function() {
    var meta = parser(opts);

    assert(meta);
    assert(meta.types);
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
