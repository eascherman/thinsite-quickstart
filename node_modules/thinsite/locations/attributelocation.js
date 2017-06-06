
import {CompiledHtmlAttribute} from '../compiler/attribute.js';
import {onChange} from '../changedetection.js';


export default class AttributeLocation {
    constructor(host, parent, index) {
        if (!(host instanceof Element))
            throw Error('Invalid location host');
            
        this.host = host;
        this.parent = parent;
        this.index = index;
    }

    createChild() {}

    clear() {}

    install(obj) {
        var thiz = this;
        if (Array.isArray(obj)) {
            obj.forEach(function(o) {
                this.install(o);
            }, this);
        } else if (obj instanceof Function) {
            // todo: add cancellation, this is likely a memory leak
            this.updater = onChange(function() {
                var val = obj(thiz.host);
                thiz.install(val);
            });
        } else if (obj instanceof CompiledHtmlAttribute) {
            this.updater = onChange(function() {
                var name = obj.getName(thiz.host);
                if (name && name.length > 0) 
                    thiz.host.setAttribute(name, obj.getValue(thiz.host));
            });
        } 
    }

    remove() {
        if (this.updater)
            this.updater.cancel();
    };
}