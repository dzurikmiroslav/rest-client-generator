'use strict';

var assert = require('assert');
var fs = require('fs');
var rimraf = require('rimraf');
var restClientGenerator = require('../lib/rest-client-generator');
var wadlParser = require('../lib/wadl-parser');
var swagParser = require('../lib/swagger2-parser');
var exec = require('child_process');

var outDir = __dirname + '/out';

var wadlOpts = {
    input: __dirname + '/application.wadl',
    outputFile: outDir + '/service_wadl.ts',
    platform: 'angular5-ts',
    rootUrl: 'localhost:8080',
    serviceSuffix: 'Service',
    serviceExclude: 'endpoint',
    methodExclude: 'method',
    capitalize: true,
    internalVariablePrefix: '_'
};

var swagOpts = {
    input: __dirname + '/application.yaml',
    outputFile: outDir + '/service_swag.ts',
    platform: 'angular5-ts',
    rootUrl: 'localhost:8080',
    serviceSuffix: 'Service',
    serviceExclude: 'endpoint',
    methodExclude: 'method',
    capitalize: true,
    internalVariablePrefix: '_'
};

rimraf.sync(outDir);
fs.mkdirSync(outDir);

describe('wadl-parser', function () {
    it('should do something', function (done) {
        wadlParser(wadlOpts).then(function (meta) {
            assert(meta);
            assert(meta.types);
            assert.equal(meta.rootUrl, wadlOpts.rootUrl);
            assert(meta.services);

            fs.writeFileSync(outDir + '/meta_wadl.json', JSON.stringify(meta, 1, 1), 'utf8');

            done();
        }, function (err) {
            done(err);
        });
    });
});

describe('swagger2-parser', function () {
    it('should do something', function (done) {
        swagParser(swagOpts).then(function (meta) {
            assert(meta);
            assert(meta.types);
            assert.equal(meta.rootUrl, wadlOpts.rootUrl);
            assert(meta.services);

            fs.writeFileSync(outDir + '/meta_swag.json', JSON.stringify(meta, 1, 1), 'utf8');

            done();
        }, function (err) {
            done(err);
        });
    });
});


describe('wadl-api-generator', function () {
    it('should do something', function (done) {
        this.timeout(10000);

        restClientGenerator(wadlOpts).then(function () {
            var serviceSrc = fs.readFileSync(wadlOpts.outputFile, 'utf8');
            assert(serviceSrc);

            //try compile generated typescript
            exec.execSync('tsc ' + wadlOpts.outputFile + ' --experimentalDecorators --moduleResolution node --baseUrl ./../node_modules/ --target ES6');

            done();
        }, function (err) {
            done(err);
        });
    });
});

describe('swagger2-api-generator', function () {
    it('should do something', function (done) {
        this.timeout(10000);

        restClientGenerator(swagOpts).then(function () {
            var serviceSrc = fs.readFileSync(swagOpts.outputFile, 'utf8');
            assert(serviceSrc);

            //try compile generated typescript
            exec.execSync('tsc ' + swagOpts.outputFile + ' --experimentalDecorators --moduleResolution node --baseUrl ./../node_modules/ --target ES6');

            done();
        }, function (err) {
            done(err);
        });
    });
});
