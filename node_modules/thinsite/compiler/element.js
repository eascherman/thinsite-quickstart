
import compileAttributes from './attributes.js';
import {compileHtml} from './html.js';


export function CompiledHtmlElement(name, attributes, contents) {
    this.name = name;
    this.attributes = attributes;
    this.contents = contents;
}

export default function compileElement(cursor) {
    var tagStart = cursor.collectStaticsThrough(['>', '/>', ' ', '\n', '\r']);
    var tagName = tagStart[0].substring(1);
    var tagAttrs = compileAttributes(cursor);
    var tagEnding = cursor.collectStaticsThrough(['>', '/>'], true);
    
    if (tagEnding.terminator.string == '/>') {
        return function(args) {
            return new CompiledHtmlElement(tagName, tagAttrs(args));
        };
    }  else {
        var innards = compileHtml(cursor);
        var closeTag = cursor.collectStaticsThrough(['>'], true);
        var closeTagName = closeTag[0].substring(2, closeTag[0].length - 1); 
        if (closeTagName != tagName)
            throw Error('Unexpected closing tag: expecting </' + tagName + '>, found </' + closeTagName + '>');
        return function(args) {
            return new CompiledHtmlElement(tagName, tagAttrs(args), innards(args));
        };
    }
}
