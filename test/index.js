var assert = require('assert');
var fs = require('fs');
var rimraf = require('rimraf');
var restClientGenerator = require('../lib/rest-client-generator');
var wadlParser = require('../lib/wadl-parser');
var exec = require('child_process');

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

rimraf.sync(outDir);
fs.mkdirSync(outDir);

describe('wadl-parser', function() {
    it('should do something', function() {
        var meta = wadlParser(opts);

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

        //try compile generated typescript
        this.timeout(10000);
        exec.execSync('tsc ' + opts.outputFile + ' --experimentalDecorators --moduleResolution node --baseUrl ./../node_modules/');
    });
});
