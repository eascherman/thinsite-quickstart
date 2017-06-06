
import compileAttribute from './attribute.js';


export default function compileAttributes(cursor) {
    var attrs = [];
    
    var ca = true;
    while(ca !== undefined) {
        var tc = cursor.thisChar();
        
        // move through white space
        while (tc == ' ' || tc == '\r' || tc == '\n') {
            cursor.step();
            tc = cursor.thisChar();
        }
            
        // bail if there's nothing here (end of tag reached)
        if (tc == '/' || tc == '>') 
            ca = null;
            
        ca = compileAttribute(cursor);
        if (ca !== undefined) {
            attrs.push(ca);
        }
    }
    
    return function(args) {
        return attrs.map(function(attr) {
            if (typeof attr == 'string')
                return attr;
            else if (attr instanceof Function)
                return attr(args);
            else
                return args[attr + 1];
        });
    };
}