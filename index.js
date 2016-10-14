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
 * @param {string} bundlePath     The path to the main js bundle generated from webpack
 * @param {object} reactRoutes    React Router JSX Route object with nested Routes
 * @param {object} props          object that is passed into the function, and defined in the
 *                                constructor of the render plugin
 * @param {function} watchFiles   Callback function to be called with the return html string
 *
 * @constructor
 */
function StaticRenderWebpackPlugin(bundlePath, reactRoutes, props, watchFiles) {
  this.bundlePath = bundlePath;

  // React Router JSX Routes object, top level being <Route />
  this.reactRoutes = reactRoutes;

  // Initial props is an object passed into the render function
  this.props = props;

  // An array of file paths to keep an eye on for changes
  this.watchFiles = watchFiles;
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

    var sourceAsset = compiler.assets[self.bundlePath];

    if (sourceAsset) {
      try {
        var source = sourceAsset.source(); // The string content of the bundle

        // The source file is expected to return a module function by default
        // This function takes two parameters, a local and a callback

        // Using evaluate to retrieve the exported function from the source file
        var render = evaluate(
          /* source: */ source, 
          /* filename: */ self.bundlePath, 
          /* scope: */ undefined, 
          /* noGlobals: */ true);

        // Convert React Router JSX Object to an array of routes
        var outputRules = reactRouterToArray(self.reactRoutes);

        var renderPromises = outputRules.map(function(outputRule) {
          var renderPath = getInputPath(outputRule);
          var outputFilePath = getOutputPath(outputRule);

          return Q.Promise(function(resolve) {
            /**
             * Props is either an object or a function which returns a value
             */
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
        // Catch errors here and print them in webpack's error handler, without stopping webpack-dev-server
        compiler.errors.push(err);
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
