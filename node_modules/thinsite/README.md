
# Thinsite
Building web applications can get complicated fast
But maybe it doesn't have to be that way

Note: This project is currently at a proof of concept stage.  It is not ready for production use. 

# Simple, Flexible
Thinsite is a lightweight set of tools for building web applications.  It is not a heavy framework that reinvents how websites work.  It is a library of functions that acts as a thin layer between your code and the DOM.  Rather than a complicated design with a specialized tool for each type of activity, it enables through a small number of flexibile tools.  


# Fast
It's simple, so it downloads and starts up quickly with no timeouts or other asynchronous delays.  Thinsite does not work via blind polling like many major frameowrks.  Instead, it maintains an internal record of dependencies, allowing it to recalculate only the things that actually change.  This means complex applications running at high levels of abstraction are still fast and efficient.


# Core concepts
1. Your code assembles values, functions, bundles, arrays, and other things to represent your content.  The rendering engine will then produce and maintain the DOM by applying the rendering rules to your content.  Almost any javascript object or value is valid as content.
2. Functions are used to represent dynamic content.  The rendering engine will automatically re-evaluate the function and update the DOM whenever a change to something it depends upon is detected.
3. A template literal tag called bundle is used to build markup.  This syntax is a somewhat recent addition to javascript.  You can read more here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals Strings that look like HTML or SVG will not be rendered as markup, they will render as plain text nodes.
4. The change detector needs to be told about mutable values.  It proxies the properties to add code that alerts it when the value changes.
5. Functions used as content are called with the element containing them as their first argument.  This argument provides general programmatic access to elements so you can do things like attach event listeners.  The libary includes a series of on.[eventname] functions as sugar to streamline event handling.


# A Simple Example
Demo: 
```javascript
import {obs, install, bundle, on, map} from './node_modules/thinsite/exports.js';

let state = {
    name: 'World'
};
obs(state, 'name');     // notify change detector of mutable property

let content = bundle    // build a bundle of markup
    `<input ${on.input(ev => state.name = ev.target.value)} placeholder="name" />
    <h2>Hello, ${() => state.name}!</h2>`;

install(content, document.body);    // bootstrap our content
```


# Get Started
First, add the files to your project
```shell
npm install thinsite --save
```

Use via import (recommended):
```javascript
import {obs, install, bundle, on, map} from './node_modules/thinsite/exports.js';
```

Use as a script:
```html
<script src="node_modules/thinsite/standalone/all.umd.js"></script>
```
Note: functions are attached to a single global "ts" variable when used via script tag so as not to pollute the window

