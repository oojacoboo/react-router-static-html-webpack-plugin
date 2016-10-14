//var fs = require('fs');

var Q = require('q');
var evaluate = require('eval');
var path = require('path');
var reactRouterToArray = require('react-router-to-array');

/**
 * This module/plugin waits for webpack to finish compiling, then it looks at a
 * specified bundlePath/entry file (usually bundle.js), look for the export
 * function, which has three arguments:
 *
 * module.exports = function(path, props, callback) {}
 *
 * This plugin was forked from the static-site-generator-webpack-plugin by Qiming Weng
 * which was inspired by Mark Dalgleish's plugin, https://github.com/markdalgleish/static-site-generator-webpack-plugin
 *
 * License (MIT) https://github.com/qimingweng/static-render-webpack-plugin
 *
 * @param {string} rootPath         The absolute root path of the project
 * @param {string} bundlePath       The path to the main js bundle generated from webpack
 * @param {object} reactRoutes      Path to the React Router JSX Routes
 * @param {object} [props={}]       Initial props is an object passed into the render function
 * @param {array} [watchFiles=[]]   An array of file paths to keep an eye on for changes
 * @constructor
 */
function StaticRenderWebpackPlugin(rootPath, bundlePath, reactRoutesPath, props, watchFiles) {
  this.rootPath = rootPath
  this.bundlePath = bundlePath;
  this.reactRoutesPath = reactRoutesPath;
  this.props = props || {};
  this.watchFiles = watchFiles || [];
}

StaticRenderWebpackPlugin.prototype.apply = function(compiler) {
  var self = this;

  compiler.plugin('after-compile', function(compiler, done) {
    // Keep an eye on these file paths, and recompile in watch mode if they change
    if (Array.isArray(self.watchFiles)) {
      self.watchFiles.forEach(function(src) {
        compiler.fileDependencies.push(src);
      });
    }

    require('ts-node').register({
      project: self.rootPath,
      ignoreWarnings: [],
      disableWarnings: false,
      compilerOptions: {
        rootDir: self.rootPath
      },
      fast: true,
      lazy: true
    });

    var sourceAsset = compiler.assets[self.bundlePath];

//    require.extensions['.png'] = function(){};
//    require.extensions['.scss'] = function(){};
//    require.extensions['.gif'] = function(){};
//    require.extensions['.jpg'] = function(){};
//    require.extensions['.jpeg'] = function(){};

    var Routing = require(self.reactRoutesPath);
    console.log(Routing.default);

    var outputRules = reactRouterToArray(Routing.default);

    if (sourceAsset) {
      try {
        var source = sourceAsset.source(); //string content of the bundle
//        var routes = []; //string content of Routes overridden below
//        fs.readFile(self.reactRoutesPath, 'utf8', function(err, data) {
//          if(err) {
//            compiler.errors.push(err);
//          }
//
//          var routes = data;
//          console.log(routes);
//        });

        //the source file is expected to return a module function by default
        //this function takes two parameters, a local and a callback

        //using evaluate to retrieve the exported function from the source/routes files
        //https://github.com/pierrec/node-eval
        var render = evaluate(source, self.bundlePath, undefined, true);
//        var outputRules = reactRouterToArray(
//          evaluate(routes, self.bundlePath, undefined, true)
//        );

        var renderPromises = outputRules.map(function(outputRule) {
          var renderPath = getInputPath(outputRule);
          var outputFilePath = getOutputPath(outputRule);

          return Q.Promise(function(resolve) {
            //props is either an object or a function which returns a value
            var props = self.props;

            if (typeof props == 'function') {
              props = props();
            }

            render(renderPath, props, function(htmlString) {
              resolve(htmlString);
            });
          }).then(function(result) {
            // Save the new file created
            compiler.assets[outputFilePath] = createAssetFromContents(result);
          }).fail(function(error) {
            // Catch errors here and print them in webpack's error handler, without stopping webpack-dev-server
            compiler.errors.push(error);
          });
        });

        Q.all(renderPromises).then(function() {
          done();
        });
      } catch (err) {
        //catch errors here and print them in webpack's error handler, without stopping webpack-dev-server
        compiler.errors.push(err.stack)
        done();
      }
    } else {
      done();
    }
  });
}

var getInputPath = function(outputRule) {
  if (typeof outputRule == 'string') return outputRule;
  if (typeof outputRule == 'object') return outputRule.path;
}

var getOutputPath = function(outputRule) {
  if (typeof outputRule == 'string') return path.join(outputRule, '/index.html');
  if (typeof outputRule == 'object') return outputRule.output;
}

var createAssetFromContents = function(contents) {
  return {
    source: function() {
      return contents;
    },
    size: function() {
      return contents.length;
    }
  }
}

module.exports = StaticRenderWebpackPlugin;
