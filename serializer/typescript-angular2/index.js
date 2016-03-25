var fs = require('fs');
var ejs = require('ejs');
var formatter = require('typescript-formatter/lib/formatter');

var template = ejs.compile(fs.readFileSync(__dirname + '/main.ejs', 'utf8'), {
  filename: __dirname + '/main.ejs'
});

module.exports = function(meta, options) {
  var src = template(meta)
    .replace(/&amp;lt;/g, '<')
    .replace(/&amp;gt;/g, '>')
    .replace(/^\s*[\r\n]/gm, '');

  fs.writeFileSync(options.outputFile, formatter.default('', src), 'utf8');
}
