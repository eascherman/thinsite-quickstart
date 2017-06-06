(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

var counter = 0;
function newId() {
    return counter++;
}

function invalidate(obj) {
    var deps = obj.dependents;
    obj.dependents = {};
    obj.cache = undefined;
    Object.keys(deps).forEach(function(key) {
        invalidate(deps[key]);
    });
    if (obj.onInvalidate) {
        if (currentDependent)
            onInvalidateQueue.push(obj.onInvalidate);
        else
            obj.onInvalidate();
    }
}








var currentDependent;
var onInvalidateQueue = [];

// a getterSetter that detects array changes






function relativeGetterSetter(getter, setter) {
    // var out = {
    //     id: newId(),
    //     dependents: {},
    //     get: function get() {
    //         if (currentDependent)
    //             out.dependents[currentDependent.id] = currentDependent;
    //         // use the getter if there's no valid cache
    //         if (!out.cache) {
    //             var oldDependent = currentDependent;
    //             currentDependent = out;
    //             try {
    //                 out.cache = {value: getter()};
    //             } catch (err) { 
    //                 throw err;
    //             }
    //             currentDependent = oldDependent;   
    //         }
    //         // if this is the root call, process any outstanding onInvalidate callbacks
    //         if (!currentDependent) {
    //             var queue = onInvalidateQueue;
    //             onInvalidateQueue = [];
    //             queue.forEach(function(func) {
    //                 func();
    //             })
    //         }
    //         return out.cache.value;
    //     }
    // };
    
    var out = function get() {
        if (currentDependent)
            get.dependents[currentDependent.id] = currentDependent;
        // use the getter if there's no valid cache
        if (!get.cache) {
            var oldDependent = currentDependent;
            currentDependent = get;
            try {
                get.cache = {value: getter()};
            } catch (err) { 
                throw err;
            }
            currentDependent = oldDependent;   
        }
        // if this is the root call, process any outstanding onInvalidate callbacks
        if (!currentDependent) {
            var queue = onInvalidateQueue;
            onInvalidateQueue = [];
            queue.forEach(function(func) {
                func();
            });
        }
        return get.cache.value;
    };
    out.id = newId();
    out.dependents = {};
    out.get = out;
    
    if (setter)
        out.set = function set(value) {
            setter(value);
            invalidate(out);
        };
    
    return out;
}


function onChange(trigger, callback) {
    var gs = relativeGetterSetter(trigger);
    var continues = true;
    gs.onInvalidate = function onChangeCallback() {
        if (continues) {
            gs.get();
            if (callback)
                callback();
        }
    };
    gs.get();
    return {
        cancel: function cancelOnChange() {
            gs.onInvalidate = undefined;
            continues = false;
        }
    };   
}

// liked a linked list but it can have a tree of children as well
// used to manage locations of content in the DOM

class LinkedTree {
    constructor(parent) {
        this.parent = parent;
    }

    appendChild(lt) {
        if (!lt)
            lt = new LinkedTree(this);
        else
            lt.parent = this;
        if (this.last)
            this.last.itemAfter = lt;
        lt.itemBefore = this.last;
        this.last = lt;
        if (!this.first)
            this.first = lt;
        
        return lt;
    }

    insert(lt) {
        lt = lt || new LinkedTree(this.parent);
        lt.itemBefore = this.itemBefore;
        lt.itemAfter = this;
        if (this.itemBefore)
            this.itemBefore.itemAfter = lt;
        this.itemBefore = lt;
        
        return lt;
    }

    remove() {
        if (!this.parent) return;
        
        var itemBefore = this.itemBefore;
        var itemAfter = this.itemAfter;
        if (this.itemBefore)
            this.itemBefore.itemAfter = itemAfter;
        if (this.itemAfter)
            this.itemAfter.itemBefore = itemBefore;
        if (this.parent.first === this)
            this.parent.first = itemAfter;
        if (this.parent.last === this)
            this.parent.last = itemBefore;
        
        this.wasAfter = itemBefore;
        this.wasBefore = itemAfter;
        this.itemBefore = null;
        this.itemAfter = null;
    }

    forEach(func, thiz) {
        var child = this.first;
        while (child) {
            var next = child.itemAfter;     // retrieve first in case func affects it
            func.call(thiz, child);
            child = next;
        }
    }
}

function Bundle(args) {
    this.args = args;
    var strings = args[0];
    if (!(strings instanceof Array))
        throw Error('Invalid bundle call');
    this.strings = strings;
}

function bundle() {
    return new Bundle(arguments);
}

class CompiledHtmlAttribute {
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


function compileAttribute(cursor) {
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

function compileAttributes(cursor) {
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

function CompiledHtmlElement(name, attributes, contents) {
    this.name = name;
    this.attributes = attributes;
    this.contents = contents;
}

function compileElement(cursor) {
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

function Cursor(b) {
    var stringCursor = 0;
    var charCursor = 0;

    this.getStringCursor = function() {
        return stringCursor;
    };

    function thisString() {
        return b.strings[stringCursor];
    }

    this.thisChar = function() {
        var ts = thisString();
        if (!ts)
            return undefined;
        return ts[charCursor];
    };
    
    this.thisItem = function() {
        if (charCursor == -1)
            return b.args[stringCursor];
        else
            return this.thisChar();
    };
    
    this.isComplete = function() {
        return stringCursor >= b.strings.length;
    };
    
    this.step = function() {
        // increment cursor positions
        var ts = thisString();
        if (charCursor >= ts.length - 1) {
            charCursor = -1;
            stringCursor++;
        } else
            charCursor++;
            
        // return the new current item
        return this.thisItem();
    };

    function remainingStrings() {
        var out = '';
        var cc = Math.max(charCursor, 0);
        for (var i = stringCursor ; i < b.strings.length ; i++) {
            for (var j = cc ; j < b.strings[i].length ; j++)
                out += b.strings[i][j];
            cc = 0;
        }
        return out;
    }
    this.remainingStrings = remainingStrings;
    
    this.collectStaticsThrough = function(terminators, includeTerminator) {
        var rs = remainingStrings;
        if (includeTerminator === undefined)
            includeTerminator = false;
        var out = [];
        if (charCursor == -1)
            out.push(stringCursor - 1);
        var firstTerminator;
        while (!firstTerminator && stringCursor < b.strings.length) {
            var ts = thisString();
            terminators.forEach(function (t) {
                var loc = ts.indexOf(t, charCursor);
                if (loc > -1 && (!firstTerminator || (firstTerminator && loc < firstTerminator.location)))
                    firstTerminator = {
                        location: loc,
                        string: t
                    };
            });
            if (firstTerminator) {
                var finalChar = firstTerminator.location;
                if (includeTerminator)
                    finalChar += firstTerminator.string.length;
                var piece = thisString().substring(charCursor, finalChar);
                if (piece.length > 0)
                    out.push(piece);
                charCursor = finalChar;
                out.terminator = firstTerminator;
                return out;
            } else {
                var piece = thisString().substring(charCursor);
                if (piece.length > 0)
                    out.push(piece);
                if (stringCursor < b.args.length - 1)
                    out.push(stringCursor);
                charCursor = 0;
                stringCursor++;
            }
        }
        return out;
    };
}

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


function getCompiledHtmlBundle(b) {
    var sig = JSON.stringify(b.strings);
    if (!compiledBundles.html[sig]) {
        var cursor = new Cursor(b);
        compiledBundles.html[sig] = compileHtml(cursor);
    }
    return compiledBundles.html[sig](b.args);
}


function compileHtml(cursor) {
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

class AttributeLocation {
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

class HtmlLocation extends LinkedTree {
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

function install(obj, host, before) {
    if (typeof host === 'string')
        host = document.getElementById(host);
        
    var loc = new HtmlLocation(undefined, host, before);
    loc.install(obj);    
    
    return loc;
}

var on = (function() {
    function on(name, callback) {
        return function(el) {
            return el.addEventListener(name, callback);
        };
    }

    var eventNames = [
        'click', 'contextmenu', 'dblclick', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseover', 'mouseout', 'mouseup',
        /*'keydown', 'keypress', 'keyup',*/     // handled elsewhere
        'abort', 'load', 'scroll',
        'blur', 'change', 'focus', 'focusin', 'focusout', 'input', 'invalid', 'reset', 'search', 'select', 'submit',
        'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop',
        'copy', 'cut', 'paste',
        'animationend', 'animationiteration', 'animationstart',
        'transitionend',
        'show', 'toggle', 'wheel'
    ];
    var evFunc = name => action => el => el.addEventListener(name, action);
    for (var i=0; i<eventNames.length; i++) {
        var name = eventNames[i];
        on[name] = evFunc(name);
    }

    // todo: implement scroll
    on.wheel.down = function wheelDown(callback) {
        return on.wheel(function(ev) {
            ev.preventDefault();
            if (ev.wheelDelta < 0)
                callback(ev);
        });
    };
    on.wheel.up = function wheelUp(callback) { 
        return on.wheel(function(ev) {
            ev.preventDefault();
            if (ev.wheelDelta > 0)
                callback(ev);
        });
    };

    // keystroke sugar:
    //  on.keydown.g(ev => console.log('you pressed g!'));
    //  on.keydown.ctrl.s(functionThatSavesMyStuff)(document.body);

    var chars;
    var otherKeys;
    function loadKeyNames(evName, evSetup) {
        if (!chars) {
            chars = [];
            for (var i=0 ; i<230 ; i++) {
                var char = String.fromCharCode(i);
                if (char.length != "")
                    chars.push(char);
            }
        }
        if (!otherKeys)
            otherKeys = {
                //shift:16, ctrl:17, alt:18,
                backspace:8, tab:9, enter:13, pause:19, capsLock:20, escape:27,
                pageUp:33, pageDown:34, end:35, home:36, left:37, up:38, right:39, down:40,
                insert:45, delete:46, 
                leftWindow:91, rightWindow:92, select:93, 
                f1:112, f2:113, f3:114, f4:115, f5:116, f6:117, f7:118, f8:119, f9:120, f10:121, f11:122, f12:123, 
                numLock:144, scrollLock:145
            };

        Object.keys(otherKeys).forEach(function(keyName) {
            evSetup[keyName] = function(callback) {
                return evSetup(function(ev) {
                    if (otherKeys[keyName] === ev.which) {
                        ev.preventDefault();
                        callback(ev); 
                    }
                });
            };
        });
        
        function setupChars(obj, test) {
            chars.forEach(function(char) {
                obj[char] = function(callback) { 
                    return evSetup(function(ev) {
                        if ((!test || test(ev)) && String.fromCharCode(ev.which).toLowerCase() === char) {
                            ev.preventDefault();
                            callback(ev); 
                        }
                    });
                };
            });
        }

        function setupModKey(key, test) {
            lazyProperty(evSetup, key, function() {
                var out = function(callback) {
                    return evSetup(function(ev) {
                        if (otherKeys[keyName] === ev.which) {
                            ev.preventDefault();
                            callback(ev); 
                        }
                    });
                };
                setupChars(out, test);
                return out;
            });
        }
        
        setupChars(evSetup);
        setupModKey('ctrl', function(ev) { return ev.ctrlKey || ev.metaKey; });
        setupModKey('shift', function(ev) { return ev.shiftKey; });
        setupModKey('alt', function(ev) { return ev.altKey; });
    }

    function lazyProperty(obj, prop, initialize) {
        if (Object.defineProperty) {
            Object.defineProperty(obj, prop, {
                enumerable: true,
                configurable: true,
                get: function() {
                    var value = initialize.apply(this);
                    Object.defineProperty(obj, prop, {
                        enumerable: true,
                        configurable: true,
                        value: value
                    });
                    return value;
                }
            });
        } else {
            obj[prop] = initialize.apply(obj);
        }
    }

    ['keydown', 'keyup', 'keypress'].forEach(function(evName) {
        lazyProperty(on, evName, function() {
            var out = function(callback) {
                return on(evName, callback);
            };
            loadKeyNames(evName, out);
            return out;
        });
    });

    return on;
})();

function eventTrigger(thiz) {
    var counter = 1;
    var out = function(callback) {
        var id = counter++;
        out.dependents[id] = callback;
        out.remove = function() {
            delete out.dependents[id];
        };
    };
    out.trigger = function() {
        var args = arguments;
        Object.keys(out.dependents).forEach(function(key) {
            var callback = out.dependents[key];
            callback.apply(thiz, args);
        });
    };
    out.dependents = {};

    return out;
}

function alertArray(arr) {
    if (!arr.onRemove) {
        arr.onRemove = eventTrigger(arr);
        arr.onInsert = eventTrigger(arr);

        var push = arr.push;
        arr.push = function(val) {
            var out = push.call(arr, val);
            arr.onInsert.trigger(val, arr.length);
            return out;
        };

        var pop = arr.pop;
        arr.pop = function() {
            var out = pop.apply(arr);
            arr.onRemove.trigger(arr.length - 1);
            return out;
        };

        var shift = arr.shift;
        arr.shift = function() {
            var out = shift.apply(arr);
            arr.onRemove.trigger(0);
            return out;
        };

        var unshift = arr.unshift;
        arr.unshift = function(val) {
            var out = unshift.call(arr, val);
            arr.onRemove.trigger(val, 0);
            return out;
        };

        var splice = arr.splice;
        arr.splice = function(pos, deleteCount) {
            pos = pos.valueOf(); 
            var out = splice.apply(arr, arguments);
            while (deleteCount > 0) {
                arr.onRemove.trigger(pos + deleteCount - 1);
                deleteCount--;
            }
            for (var i=2; i<arguments.length; i++) {
                var item = arguments[i];
                arr.onInsert.trigger(item, pos + i - 2);
            }
            return out;
        };
    }
}

function bindMap(arr, transform) {
    function posGetter(val) {
        var out = function getPos() {
            for (var i=0; i<arr.length; i++)
                if (val === arr[i])
                    return i;
        };
        out.valueOf = out;
        return out;
    }

    // map via for loop to prevent undesired change detection
    var out = [];
    for (var i=0; i<arr.length; i++) {
        var item = arr[i];
        var tItem = transform(item, posGetter(item), arr);
        out.push(tItem);
    }

    alertArray(arr);
    arr.onRemove(function(pos) {
        return out.splice(pos, 1);
    });
    arr.onInsert(function(item, pos) {
        var tItem = transform(item, posGetter(item), arr);
        return out.splice(pos, 0, tItem);
    });

    return out;
}

function arrInstall(arr) {
    alertArray(arr);
    var initialized = false;
    var installations = [];

    return function(el, loc) {
        if (!initialized) {
            initialized = true;

            arr.onRemove(function(pos) {
                arr;
                var inst = installations[pos];
                inst.remove();
                installations.splice(pos, 1);
            });
            arr.onInsert(function(item, pos) {
                arr;
                var instPos = installations[pos];
                var inst;
                if (instPos)
                    inst = instPos.insertContent(item);
                else
                    inst = loc.installChild(item, el);
                installations.splice(pos, 0, inst);
            });

            arr.forEach(function(item) {
                var inst = loc.installChild(item, el);
                installations.push(inst);
            });
        }
    };
}


function map(arr, transform) {
    return arrInstall(bindMap(arr, transform));
}

let content = bundle`<h1>Hello, World!</h1>
    ${map([1, 2, 3], (n, i, arr) => bundle`<div>
            <button ${on.click(ev => arr.splice(i, 1))}></button>
            ${n}
        </div>`)}`;

install(content, document.body);

})));
//# sourceMappingURL=main.build.js.map
