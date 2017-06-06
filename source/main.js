
import {obs, install, on, map, bundle} from '../node_modules/thinsite/exports.js';


let content = bundle
    `<h1>Hello, World!</h1>`;

install(content, document.body);