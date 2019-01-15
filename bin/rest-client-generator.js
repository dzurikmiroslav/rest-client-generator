#!/usr/bin/env node

'use strict';
var restClientGenerator = require('../lib/rest-client-generator');
var program = require('commander');
var pkg = require('../package.json');

program
    .version(pkg.version)
    .usage('[options] <wadl>')
    .arguments('<wadl>')
    .option('--output-file <value>', 'output file', 'services.ts')
    .option('--platform <value>', 'platform, yet only: \'angular2-ts\', \'angular5-ts\', \'angular6-ts\'', /^(angular2-ts|angular5-ts|angular6-ts)$/i, 'angular6-ts')
    .option('--root-url <value>', 'root URL of all REST calls')
    .option('--default-service-name <value>', 'if first resource in WADL has method the service name')
    .option('--service-suffix <value>', 'service name suffix', 'Service')
    .option('--service-exclude <value>', 'string that will be removed in service name')
    .option('--method-exclude <value>', 'string that will be removed in method name')
    .option('--module-name <value>', 'service module name', 'ServiceModule')
    .option('--internal-variable-prefix <value>', 'internal variable prefix', '_')
    .option('--no-capitalize', 'no capitalize resource and type names')

program.on('--help', function () {
    console.log('');
    console.log('  Examples:');
    console.log('');
    console.log('    $ rest-client-generator --output-file services.ts --root-url http://my.server/rest/ application.wadl');
    console.log('    $ rest-client-generator --output-file services.ts http://my.server/rest/application.wadl');
    console.log('    $ rest-client-generator --output-file services.ts https://user:pass@my.server/rest/application.wadl');
    console.log('    $ rest-client-generator --output-file services.ts swagger.yaml');
    console.log('');
});

program.parse(process.argv);

if (program.args.length !== 1) {
    program.help();
} else {
    restClientGenerator({
        input: program.args[0],
        outputFile: program.outputFile,
        platform: program.platform,
        rootUrl: program.rootUrl,
        defaultServiceName: program.defaultServiceName,
        capitalize: program.capitalize,
        serviceSuffix: program.serviceSuffix,
        serviceExclude: program.serviceExclude,
        methodExclude: program.methodExclude,
        moduleName: program.moduleName,
        internalVariablePrefix: program.internalVariablePrefix
    });
}
