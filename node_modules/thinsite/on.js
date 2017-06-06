
export default (function() {
    function on(name, callback) {
        return function(el) {
            return el.addEventListener(name, callback);
        };
    };

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
    };

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