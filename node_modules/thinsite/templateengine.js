
import HtmlLocation from './locations/htmllocation.js';


export default function install(obj, host, before) {
    if (typeof host === 'string')
        host = document.getElementById(host);
        
    var loc = new HtmlLocation(undefined, host, before);
    loc.install(obj);    
    
    return loc;
}
