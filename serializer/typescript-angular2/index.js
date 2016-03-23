var fs = require('fs');
var ejs = require('ejs');

var typeTemplate = ejs.compile(fs.readFileSync(__dirname + '/main.ejs', 'utf8'), {
  filename: __dirname + '/main.ejs'
});

module.exports = function(meta, options) {
  fs.writeFileSync(options.outputFile, typeTemplate(meta).replace(/&amp;lt;/g, '<').replace(/&amp;gt;/g, '>'), 'utf8');
}
