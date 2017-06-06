

export default function Cursor(b) {
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
    }

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
