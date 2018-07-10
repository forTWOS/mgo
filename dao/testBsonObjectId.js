/**
 * Created by Linqy on 2018\7\9 0009.
 * 1000次/10ms=1000*100次/秒 够用
 */

const rand = Math.random();
console.log('rand:', rand);
const MACHINE_ID = parseInt(rand * 0xffffff, 10);//有非常小机率重复
console.log('MACHINE_ID:', MACHINE_ID);


let index = ~~(Math.random() * 0xffffff);
const get_inc = () => {
    return (index = (index+1)% 0xffffff);
};
// Use pid
const pid =
    (typeof process === 'undefined' || process.pid === 1
        ? Math.floor(Math.random() * 100000)
        : process.pid) % 0xffff;

const generate = function(time) {
    // if ('number' !== typeof time) {
        let now = Date.now();
        // console.log('now:', now, now / 1000);
        time = ~~(now / 1000);//取整
        // console.log('time:', time);
    // }

    // console.log('pid:', pid);
    let inc = get_inc();
    // console.log('inc:', inc);

    // Buffer used
    let buffer = new Buffer(12);
    // Encode time
    buffer[3] = time & 0xff;
    buffer[2] = (time >> 8) & 0xff;
    buffer[1] = (time >> 16) & 0xff;
    buffer[0] = (time >> 24) & 0xff;
    // Encode machine
    buffer[6] = MACHINE_ID & 0xff;
    buffer[5] = (MACHINE_ID >> 8) & 0xff;
    buffer[4] = (MACHINE_ID >> 16) & 0xff;
    // Encode pid
    buffer[8] = pid & 0xff;
    buffer[7] = (pid >> 8) & 0xff;
    // Encode index
    buffer[11] = inc & 0xff;
    buffer[10] = (inc >> 8) & 0xff;
    buffer[9] = (inc >> 16) & 0xff;
    // Return the buffer
    return buffer;
};
const hexTable = [];
for (let i = 0; i < 256; i++) {
    hexTable[i] = (i <= 15 ? '0' : '') + i.toString(16);
}
// console.log('hexTable:', hexTable);

const toHexString = function(buf) {
    let hexString = '';

    if (buf instanceof Buffer) {
        hexString = buf.toString('hex');
        return hexString;
    }

    for (let i = 0; i < this.id.length; i++) {
        hexString += hexTable[this.id.charCodeAt(i)];
    }

    return hexString;
};

let buf = generate();
console.log(buf, buf.toString(), buf.toString('hex'), toHexString(buf));
setInterval(() => {
    for (let i = 0; i < 1000; ++i) {
        let buf = generate();
        toHexString(buf);
    }
}, 10);