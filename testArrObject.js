/**
 * Created by Linqy on 2018\7\9 0009.
 */
const C = class Me {
    constructor() {
        Me.a = 'a';
    }
    get name() {
        console.log('getter');
        return Me.a;
    }
    set name(n) {
        console.log('setter:', n);
        Me.a = n;
    }
};
let c1 = new C();
console.log(c1, c1.name);
let arr = [c1];
// arr.push(c1);
console.log(arr);
console.log(arr[0].name);
arr[0].name = '1';

const c2 = arr[0];
console.log(c2.name);
c2.name = 10;

console.log('////////////////////////////////////////');
const CArr = class Me extends Array {
    constructor(...args) {
        super(...args);
    }
    push(...args) {
        super.push(...args);
        console.log('push')
    }
};
let ca1 = new CArr();
console.log(ca1);
ca1.push(10);
console.log(ca1);
ca1[1]=11;// cannot get listener
console.log(ca1);