#!/usr/bin/env node

'use strict';
var restClientGenerator = require('../lib/rest-client-generator');
var program = require('commander');

program
    .version('0.1.0')
    .usage('[options] <wadl>')
    .arguments('<wadl>')
    .option('--output-file <value>', 'output file, default \'services.ts\'')
    .option('--platform <value>', 'platform, yet only \'angular2-ts\'', /^(angular2-ts)$/i, 'angular2-ts')
    .option('--root-url <value>', 'root URL of all REST calls')
    .option('--default-service-name <value>', 'if first resource in WADL has method the servic name')
    .option('--service-suffix <value>', 'service name suffix, default \'Service\'')
    .option('--module-name <value>', 'service module name, default \'ServiceModule\'')
    .option('--internal-variable-prefix <value>', 'internal variable prefix, default \'_\'')
    .option('--no-capitalize', 'no capitalize resource and type names')
    .parse(process.argv);

program.on('--help', function () {
    console.log('  Examples:');
    console.log('');
    console.log('    $ rest-client-generator --output-file services.ts --root-url http://my.server/rest/ application.wadl');
    console.log('    $ rest-client-generator --output-file services.ts http://my.server/rest/application.wadl');
    console.log('');
});

if (program.args.length !== 1) {
    program.help();
} else {
    restClientGenerator({
        wadl: program.args[0],
        outputFile: program.outputFile,
        platform: program.platform,
        rootUrl: program.rootUrl,
        defaultServiceName: program.defaultServiceName,
        capitalize: program.capitalize,
        serviceSuffix: program.serviceSuffix,
        moduleName: program.moduleName,
        internalVariablePrefix: program.internalVariablePrefix
    });
}
