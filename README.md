# Typescript and React Router static HTML Webpack plugin

[![npm](https://img.shields.io/npm/v/npm.svg?maxAge=2592000)](https://www.npmjs.com/package/typescript-react-router-static-html-webpack-plugin)

***The following is to be updated.  This plugin is forked from the following.  
However, Typescript support has been added, as well as being able to generate 
routes directly from a Routing file.***

***Documentation to be updated soon***

## Usage

You can check out [this tutorial](http://www.qimingweng.com/writing/webpack-static-render) for a real world usage example, or read below for documentation.

In your webpack config file...

```javascript
var StaticSiteGeneratorPlugin = require('static-render-webpack-plugin');

var routes = [
  '/',
  '/about',
  '/projects', // regular routes
  { // routes as an object
    path: '/not-found',
    output: '/404.html'
  }
];

module.exports = {
  entry: ...,
  output: {
    filename: 'bundle.js',
    path: ...,
    // This is really important, the plugin expects the bundle output to export a function
    libraryTarget: 'umd'
  },
  ...
  plugins: [
    new StaticSiteGeneratorPlugin('bundle.js', routes)
  ]
};
```

This setup will generate

```
/index.html
/about/index.html
/projects/index.html
/404.html
```

This module takes the output of webpack's compilation process and expects it to export a function with 3 arguments

```javascript
module.exports = function(path, props, callback) {
  // Callback with the desired HTML string
  callback(...)
}
```

### Advanced

`StaticSiteGeneratorPlugin` is a constructor that takes up to 4 arguments.

```javascript
new StaticSiteGeneratorPlugin(source, routes, props, watchFiles)
```

#### source

`String`

The route to the javascript file

#### routes

`Array<String|RouteObject>`

An array of either string routes, ex. `/`, `/about`, `/deep/route`. Or route objects, which follow this syntax:

```
{
  path: String // ex, '/', '/about'
  output: String // ex, '/404.html', '/deep/custom.file'
}
```

#### props

`Any|Function`

This property is passed to your javascript bundle as the 2nd parameter in the exported function. It can be anything.

If props is a function, the function is executed (with no parameters) every time a file needs to be rendered. This way, if you have static assets you want webpack to watch (markdown files, for instance), you can load them in with a function instead, and each time webpack compiles, the props will be different.

#### watchFiles

`Array<String>?`

This is optional. You can define an array of paths to files that you want the compiler to add to its dependencies. This way, when running webpack in watch mode, or webpack-dev-server, the files which are not in the javascript dependency tree will also be watched and can cause recompilation.

I use this to generate blog posts from .md files.

## Isomorphic Javascript

If you use React and React-Router, then your entry.js file might look something like this:

```javascript
import React from 'react';
import Router from 'react-router';
import routes from './path/to/routes';

module.exports = function(path, props, callback) {
  Router.run(routes, path, (Root) => {
    const html = React.renderToString(<Root/>);
    callback('<!doctype html>' + html);
  });
}

if (typeof document != 'undefined') {
  /**
   * Running in a web environment, re-render the entire tree onto the document,
   * react will be able to tell that what you are trying to render is exactly the same and
   * adjust itself accordingly
   */
  Router.run(routes, Router.HistoryLocation, (Root) => {
    React.render(<Root/>, document);
  });
}
```

# Using Static Render with React Hot Loader

Yes! This is possible. Look at this boilerplate project to see how: [static-render-react-hot](https://github.com/qimingweng/static-render-react-hot)
