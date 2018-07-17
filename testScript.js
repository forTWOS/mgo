/**
 * Created by Linqy on 2018\7\13 0013.
 */
let n = new Date(1531467281000);
console.log(n, typeof n, n instanceof Date);

let f = function([a, b]) {
    console.log(arguments);
    console.log(a);
    console.log(b);
};
console.log(f);
f();