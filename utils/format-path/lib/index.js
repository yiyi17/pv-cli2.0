'use strict';
const path = require('path')

module.exports = usuFormatPath;

function usuFormatPath(p) {
    if(p) {
        const sep = path.sep
        // console.log(222, sep);
        if(sep === '/') {
            return p
        }else {
            return p.replace(/\\/g, '/') 
        }
    }
    return p
    
}
