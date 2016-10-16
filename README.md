# Typescript and React Router static HTML Webpack plugin

[![npm](https://img.shields.io/npm/v/typescript-react-router-static-html-webpack-plugin.svg?style=flat&maxAge=2592000)](https://www.npmjs.com/package/typescript-react-router-static-html-webpack-plugin)

*This plugin will generate static html from your React Router configuration to allow 
for only static HTML sites, or universal/isomorphic sites.  It supports Typescript
or ES2015+ javascript through the Typescript compiler.*

*Credit given to the [static-render-webpack-plugin](https://github.com/qimingweng/static-render-webpack-plugin)
for the starting point for this plugin.*

## Getting Started

First you'll want to be sure that you've setup webpack and webpack-dev-server
```
$ npm install webpack webpack-dev-server --save-dev 
```
Then be sure you've installed this webpack plugin (sorry about the horrible name)
```
$ npm install typescript-react-router-static-html-webpack-plugin --save-dev
```

## Usage

**src/Routing.tsx**
```javascript
import ...

const Routing = (
  <Route path='/' component={Root}>
    <IndexRoute component={Home} />
    <Route path='four-oh-four' component={FourOhFour} />
    
    <Route path='about' component={About}>
        <Route path'team' component={AboutTeam} />
    </Route>
    
    <Route path='contact' component={FourOhFour} />
    
    <Route path='*' component={FourOhFour} />
  </Route>
);

export default Routing;
```

**src/index.tsx**
```javascript
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import { RouterContext, match, createRoutes } from 'react-router';
import Logger from './util/Logger'; //bootstrapping for Winston (optional)
import Routing from './Routing';

interface GenerateStaticHTML {
  (html: string): string;
}

module.exports = (path: string, props: {}, callback: GenerateStaticHTML) => {
  let html = '';
  const routes = createRoutes(Routing);

  try {
    match({
      routes,
      location: path,
    }, (err, redirect, renderProps) => {
      if (err) {
        throw Error(`${err.stack}`);
      } else if (redirect) {
        //Logger.info(`Redirecting: ${redirect}`);
      } else if (renderProps) {
        html = ReactDOMServer.renderToStaticMarkup(
          <RouterContext {...renderProps} />
        );
      } else {
        throw Error(`${path} Not Found`);
      }
    });

    callback(html);
  } catch (e) {
    Logger.error(`${e.stack}`);
  }
};
```

**webpack.config.js**
```javascript
const StaticHTMLPlugin = require('typescript-react-router-static-html-webpack-plugin');

module.exports = {
  ...
  entry: 'src/index.tsx'
  resolve: {
    extensions: [ '', '.js', '.ts', '.tsx', '.scss', '.css' ],
  },

  output: {
    filename: 'bundle.js', //the output js file
    path: root('dist'), //build directory (uses a root function to find the abs path)
    /**
     * This is really important, the plugin expects the
     * bundle output to export a function
     */
    libraryTarget: 'umd',
  },

  module: {
    loaders: [...],
  },

  plugins: [
    ...,
    new ReactRouterStaticHTMLPlugin('bundle.js', root('src/Routing.tsx')),
  ],
};
```

After you've configured your `webpack.config.js` and passed in your Routes file,
you'll then want to run webpack to generate the static HTML files.  You can do 
this one of two ways:

```
$ webpack --progress --display-error-details               #outputs the HTML to your `output.path` 
$ webpack-dev-server --progress --display-error-details    #runs a 'hot' version through node 
```
*For more information on customizing your `webpack-dev-server`, see the 
[Webpack docs](https://webpack.github.io/docs/webpack-dev-server.html).*

The above commands should output the following HTML files:
```
/index.html
/about/index.html
/about/team/index.html
/contact/index.html
/four-oh-four.html
```

This plugin takes the output of webpack's compilation process from the `bundle.js` 
(or whatever you name it) and expects it to export a function with 3 arguments

```javascript
module.exports = function(path, props, callback) {
  // Callback with the desired HTML string
  callback(...)
}
```

### Advanced

`StaticSiteGeneratorPlugin` is a constructor that takes up to 5 arguments.  Only the first two are required.

```javascript
new StaticSiteGeneratorPlugin(bundlePath, reactRoutesPath, ignoreExtensions, props, watchFiles)
```

#### `bundlePath: string`
The path to the webpack compiled javascript file, `output.filename`.

#### `reactRoutesPath: string`
The path to the Routes file that contains all your React Routes.

#### `ignoreExtensions?: string[]`
An array of extensions to be excluded from being processed and compiling within Node/Typescript.

```javascript
['.png', '.jpg', '.jpeg', '.gif', '.css', '.scss']
```

#### `props?: any`
This property is passed to your javascript bundle as the 2nd parameter in the exported function. It can be anything.

If props is a function, the function is executed (with no parameters) every time a file needs to be rendered. This way, if you have static assets you want webpack to watch (markdown files, for instance), you can load them in with a function instead, and each time webpack compiles, the props will be different.

#### `watchFiles?: string[]`
You can define an array of paths to files that you want the compiler to add to its dependencies. This way, when running webpack in watch mode, or webpack-dev-server, the files which are not in the javascript dependency tree will also be watched and can cause recompilation.


## Using Static Render with React Hot Loader

Yes! This is possible. Look at this boilerplate project to see how: [static-render-react-hot](https://github.com/qimingweng/static-render-react-hot)