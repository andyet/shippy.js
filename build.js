// Creates the shippy.js source from the provided API
// specification.

/*global __dirname*/
var fileName = 'shippy.js',
    minFileName = 'shippy.min.js',
    outputPath = __dirname + '/' + fileName,
    minifiedPath = __dirname + '/' + minFileName;

var fs = require('fs'),
    mustache = require('mustache'),
    shippySpec = require('shippy-spec'),
    yetify = require('yetify'),
    uglify = require('uglify-js'),
    colors = require('colors'),
    _ = require('underscore');

var methods = shippySpec.getMethodsByApiType('js'),
    events = shippySpec.getAllEventTypes(),
    template = fs.readFileSync(__dirname + '/src/shippy.template.js', 'utf-8').toString(),
    emitter = fs.readFileSync(__dirname + '/node_modules/wildemitter/wildemitter-bare.js', 'utf-8').toString(),
    api = {
        methods: [],
        emitter: indent(emitter)
    };

// indents the file by given amount
function indent(file, indentAmount) {
    var split = file.split('\n'),
        actualIndent = indentAmount || '    ',
        i = 0,
        l = split.length;
    for (; i < l; i++) {
        split[i] = actualIndent + split[i];
    }
    return split.join('\n');
}

methods.forEach(function (method) {
    if (method.visibility !== 'public') return;

    var hasOptionalParam = !!_.find(method.params, function (param) {
        return (param.required === false) && param.type === 'object';
    });

    var params = method.params.map(function (param) { return param.name; });

    params.push('cb');
    params = params.join(', ');
    api.methods.push({
        methodName: method.name,
        params: params,
        description: method.description,
        numParams: method.params.length,
        hasOptionalParam: hasOptionalParam
    });
});

// add quotes around all event names
events.forEach(function (event, index) {
    events[index] = '\'' + event + '\'';
});

api.events = events.join(',\n                ');

var code = mustache.render(template, api);

console.log('\n' + yetify.andBangLogo() + ':');

fs.writeFileSync(outputPath, code, 'utf-8');
console.log(fileName.bold + ' file built.'.grey);

var minified = uglify.minify(outputPath); // build out the code

fs.writeFileSync(minifiedPath, minified.code, 'utf-8');

console.log(minFileName.bold + ' file built.'.grey + '\n');
process.exit(0);
