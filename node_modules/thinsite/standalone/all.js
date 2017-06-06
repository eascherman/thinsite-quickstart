
import * as items from '../exports.js';

var ts = items.obs;
Object.keys(items).forEach(key => ts[key] = items[key]);
window.ts = ts;