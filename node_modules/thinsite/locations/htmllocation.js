
import LinkedTree from './linkedtree.js';
import getCompiledHtmlBundle from '../compiler/html.js';
import AttributeLocation from './attributelocation.js';
import {CompiledHtmlElement} from '../compiler/element.js';
import {Bundle} from '../bundle.js';
import {onChange} from '../changedetection.js';


export default class HtmlLocation extends LinkedTree {
    constructor(parent, host, before, namespace) {
        super(parent);      // may not be right?
        this.host = host;
        this.namespace = namespace;
        this.comesBefore = before;
        
        if (!before && !parent) {
            this.fallbackEnder = document.createComment('html location ender ' + this.host.nodeName);
            this.host.appendChild(this.fallbackEnder);
        }
    }

    getFirstElement() {
        if (this.ele)
            return this.ele;
        var child = this.first;
        while (child) {
            if (child.host === this.host) {
                var fe = child.getFirstElement();
                if (fe)
                    return fe;
            } else
                throw Error('unexpected child host - cannot remove if statement');
            child = child.itemAfter;
        }
    }

    getElementAfter() {
        //var ele = (function() {
            if (this.comesBefore)
                return this.comesBefore;
            var sibling = this.itemAfter;
            while (sibling) {
                if (sibling.host === this.host) {
                    var fe = sibling.getFirstElement();
                    if (fe)
                        return fe;
                } else
                    throw Error('unexpected child host - cannot remove if statement');
                sibling = sibling.itemAfter;
            }
            if (this.parent && this.parent.host === this.host)
                return this.parent.getElementAfter();
            return this.fallbackEnder;
        //}).apply(this);
        //if (!ele || ele.parentNode != this.host)
        //    throw new Error('Invalid parent node!');
        //else
        //    return ele;
    }

    createChild(host, namespace) {
        var loc = new HtmlLocation(this, host, undefined, namespace); 
        this.appendChild(loc);
        return loc;
    }

    installChild(content, host, namespace) {
        var loc = this.createChild(host, namespace);
        loc.install(content);
        return loc;
    }

    insertContent(content) {
        var ns = this.parent ? this.parent.namespace : undefined;
        var loc = new HtmlLocation(this.parent, this.host, ns);
        this.insert(loc);
        loc.install(content);
        return loc;
    }

    install(obj) {      // installs the input item in this location
        this.clear();
        this.installedContent = obj;        // todo: remove - testing
        
        if (obj === undefined || obj === null) {
            // do nothing
        } else if (!(obj instanceof Object)) {
            this.ele = document.createTextNode(obj);
            this.host.insertBefore(this.ele, this.getElementAfter());
        } else if (Array.isArray(obj)) {
            for (var i=0; i<obj.length; i++) {
                this.installChild(obj[i], this.host, this.namespace);
            }
        } else if (obj instanceof Bundle) {
            var chtml = getCompiledHtmlBundle(obj);
            for (var i=0; i<chtml.length; i++) {
                this.installChild(chtml[i], this.host, this.namespace);
            }
        } else if (obj instanceof CompiledHtmlElement) {
            var ns = this.namespace || obj.name === 'svg' ? 'http://www.w3.org/2000/svg' : undefined; 
            if (ns)
                this.ele = document.createElementNS(ns, obj.name);
            else
                this.ele = document.createElement(obj.name);
            if (obj.attributes) {
                var attrsLocation = new AttributeLocation(this.ele);
                attrsLocation.install(obj.attributes);
            }
            if (obj.contents) {
                this.installChild(obj.contents, this.ele, ns);
            }
            if (!this.ele) 
                throw new Error('Content creation triggered its own removal');
            this.host.insertBefore(this.ele, this.getElementAfter());
        } else if (obj instanceof Element) { 
            var parent = obj.parentElement;
            if (parent) {
                console.log('Element removed from one location and placed in another by install (DOM elements cannot be in multiple places at once)');
                parent.removeChild(obj);
            }
            this.ele = obj;
            this.host.insertBefore(this.ele, this.getElementAfter());
        } else if (obj instanceof Function) {
            var subLocation = this.createChild(this.host, this.namespace);
            var val;
            var fUpdate = function() { return subLocation.install(val); };
            var thiz = this;
            this.updater = onChange(function() { val = obj(thiz.host, thiz); }, fUpdate);
            fUpdate();
        } else if (obj && obj.then instanceof Function) {
            obj.then(val => this.installChild(val, this.host, this.namespace), console.error);
        } else if (obj && obj.toContent instanceof Function) {
            var cont = obj.toContent();     // no input of host so as not to cause confusion w/ function content mechanics
            this.installChild(cont, this.host, this.namespace);
        } else {
            this.ele = document.createTextNode(obj.toString());
            this.host.insertBefore(this.ele, this.getElementAfter());
            console.log('Unexpected content type - using toString');     // todo: remove?
        }
        
        this.occupant = obj;
    }

    clear() {
        if (this.hasBeenRemoved)
            //console.log('already removed');     // todo: really need to remove this
            throw Error('already removed');

        // stop update events from triggering
        if (this.updater)
            this.updater.cancel();
            
        // remove any child locations
        this.forEach(function(loc) { 
            loc.remove();
        });
        
        // remove element if location is hosting a simple literal
        if (this.ele) {
            this.host.removeChild(this.ele);
            this.ele = null;
        } else if (this.installedContent)
            this.clearedAgain = true;
    }

    remove() {        // removes the location from the dom, along with anything in it
        this.clear();
        LinkedTree.prototype.remove.call(this);
        this.hasBeenRemoved = true;
        if (this.fallbackEnder)
            this.host.removeChild(this.fallbackEnder);
    };
}