
import compileElement from './element.js';
import Cursor from './cursor.js';


var charCodes = {};
function charFromHtmlCode(code) {
    if (!charCodes[code]) {
        var ele = document.createElement('div');
        ele.innerHTML = code;
        charCodes[code] = ele.innerText;
    }
    return charCodes[code];
}

var compiledBundles = { 
    html: {}
};


export default function getCompiledHtmlBundle(b) {
    var sig = JSON.stringify(b.strings);
    if (!compiledBundles.html[sig]) {
        var cursor = new Cursor(b);
        compiledBundles.html[sig] = compileHtml(cursor);
    }
    return compiledBundles.html[sig](b.args);
}


export function compileHtml(cursor) {
    if (cursor.isComplete())
        throw Error('invalid cursor');
                    
    var nodes = [];

    var externalEndingDetected = false;
    while (!cursor.isComplete() && !externalEndingDetected) {
        var simpleNodes = cursor.collectStaticsThrough(['</', '<']);       // get any text up until the first open or close tag
        simpleNodes.forEach(function(n) {    // add any plain text to the nodes output
            if (typeof n === 'string') {
                var matches = n.match(/&(?:[a-z]+|#\d+);/g);
                if (matches)
                    matches.forEach(function(match) {
                        n = n.replace(match, charFromHtmlCode(match));
                    });
            }
            nodes.push(n); 
        }); 
        if (simpleNodes.terminator) {
            if (simpleNodes.terminator.string == '<') {    // internal tag beginning
                var ele = compileElement(cursor);
                nodes.push(ele);
            } else {
                externalEndingDetected = true;
                //cursor.collectStaticsThrough(['>'], true);
            }
        } 
    }

    return function(args) {
        return nodes.map(function(node) {
            if (typeof node == 'string') {
                return node;
            } else if (node instanceof Function) {
                return node(args);
            } else {
                return args[node + 1];
            }
        });
    };
}