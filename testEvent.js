/**
 * Created by Linqy on 2018\7\12 0012.
 */
this.aa = 'aa';
// const EventEmitter = require('events').EventEmitter;
const EventEmitter = require('events');

class CE1 extends EventEmitter {
    constructor() {
        super();
        this.name = 'ce1';
    }
}
class CE2 extends CE1 {
    constructor() {
        super();
        this.name = 'ce2';
    }
}
const ce1 = new CE1();
ce1.on('test1', () => {
    console.log('test1');
    console.log(this);
});
ce1.on('test2', function() {
    console.log('test2');
    console.log(this);
});
ce1.emit('test1');
ce1.emit('test2');

let ce3 = ce2 = new CE2();
ce2.on('test1', () => {
   console.log('ce2 test1');
   console.log(this);
});
ce2.on('test2', function() {
    console.log('ce2 test2');
    console.log(this);
});
console.log(global.ce2 === ce2, global.ce2 === ce3);
ce3.emit('test1');
global.ce2.emit('test2');