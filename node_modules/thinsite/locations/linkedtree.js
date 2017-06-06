
// liked a linked list but it can have a tree of children as well
// used to manage locations of content in the DOM

export default class LinkedTree {
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