'use strict';

var assert = require('assert');
var fs = require('fs');
var rimraf = require('rimraf');
var restClientGenerator = require('../lib/rest-client-generator');
var wadlParser = require('../lib/wadl-parser');
var exec = require('child_process');

var outDir = __dirname + '/out';

var opts = {
    wadl: __dirname + '/application.wadl',
    outputFile: outDir + '/service.ts',
    platform: 'angular2-ts',
    rootUrl: 'localhost:8080',
    serviceSuffix: 'Service',
    capitalize: true,
    internalVariablePrefix: '_'
}

rimraf.sync(outDir);
fs.mkdirSync(outDir);

describe('wadl-parser', function () {
    it('should do something', function (done) {
        wadlParser(opts).then(function (meta) {
            assert(meta);
            assert(meta.types);
            assert.equal(meta.rootUrl, opts.rootUrl);
            assert(meta.services);

            fs.writeFileSync(outDir + '/meta.json', JSON.stringify(meta, 1, 1), 'utf8');

            done();
        }, function (err) {
            done(err);
        });
    });
});

describe('wadl-client-generator', function () {
    it('should do something', function (done) {
        this.timeout(10000);

        restClientGenerator(opts).then(function () {
            var serviceSrc = fs.readFileSync(opts.outputFile, 'utf8');
            assert(serviceSrc);

            //try compile generated typescript
            exec.execSync('tsc ' + opts.outputFile + ' --experimentalDecorators --moduleResolution node --baseUrl ./../node_modules/ --target ES6');

            done();
        }, function (err) {
            done(err);
        });
    });
});
