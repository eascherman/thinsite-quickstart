
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

export function alertArray(arr) {
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
};

export function bindMap(arr, transform) {
    function posGetter(val) {
        var out = function getPos() {
            for (var i=0; i<arr.length; i++)
                if (val === arr[i])
                    return i;
        };
        out.valueOf = out;
        return out;
    };

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
};

export function arrInstall(arr) {
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
};


export default function map(arr, transform) {
    return arrInstall(bindMap(arr, transform));
};