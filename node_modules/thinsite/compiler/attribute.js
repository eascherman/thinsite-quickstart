
import {Bundle} from '../bundle.js';


export class CompiledHtmlAttribute {
    constructor(name, value, bounder) {
        this.name = name;
        this.value = value;
        this.bounder = bounder;
    }

    evaluate(host, obj) {
        if (!(obj instanceof Object)) {
            return obj;
        } else if (Array.isArray(obj)) {
            return obj.map(function(o) { 
                return this.evaluate(host, o); 
            }, this).join('');
        } else if (obj instanceof Bundle) {
            // todo: fill
        } else if (obj instanceof Function) {
            var result = obj(host);
            return this.evaluate(host, result);
        } else {
            return obj.toString();
        }
    }

    getName(host) {
        return this.evaluate(host, this.name);
    }

    getValue(host) {
        return this.evaluate(host, this.value);
    }
}


export default function compileAttribute(cursor) {
    if (cursor.isComplete())
        return undefined;
    
    var attrName;
    var attrBounder;
    
    var tc = cursor.thisChar();    
    
    // move through white space
    while (tc == ' ' || tc == '\r' || tc == '\n') {
        cursor.step();
        tc = cursor.thisChar();
    }
        
    // bail if there's nothing here (end of tag reached)
    if (tc == '/' || tc == '>') 
        return undefined;
        
    if (tc === undefined) {
        var valueLoc = cursor.getStringCursor() - 1;
        //var valueLoc = stringCursor - 1;
        cursor.step();
        return valueLoc;
    } else {
        var nameCollection = cursor.collectStaticsThrough(['=', ' ', '\r', '\n', '/', '>']);
        if (nameCollection.length > 1)      // todo: may be able to relax this limitation
            throw Error('Complex attribute names are not supported');
        attrName = nameCollection[0];
    }
    
    // determine attr value, if it exists
    tc = cursor.thisChar();
    if (tc == '=') {
        cursor.step();
        attrBounder = cursor.thisChar();
        if (attrBounder != '"' && attrBounder != "'")
            throw Error('Attribute values must be enclosed in " or \'');
        cursor.step();
        
        var staticsCollection = cursor.collectStaticsThrough([attrBounder]);
        cursor.step();      // move past closing attrBounder
        
        return function(args) {
            var attrValue = staticsCollection.map(function(item) {
                if (typeof item == 'string')
                    return item;        // number is a value index
                else
                    return args[item + 1];                // string is plain markup
            });
            return new CompiledHtmlAttribute(attrName, attrValue, attrBounder);
        };
    } else {
        return function(args) {
            return new CompiledHtmlAttribute(attrName);
        }
    }
    
    

}
