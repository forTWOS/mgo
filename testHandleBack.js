/**
 * Created by Linqy on 2018\7\9 0009.
 */
const f1 = (id) => {
    // console.log(id);
    return (err) => {
        let tid = id+err;
    };
};

const f3 = (f) => {
    f('err');
};
// %2-%3
const f2 = () => {
    for (let i = 0; i < 10; ++i) {
        f3(f1(i));
    }
};
const ff2 = (id, err) => {
    let tid = id+err;
};
// 3%
const ff1 = () => {
    for (let i = 0; i < 10; ++i) {
        f3(ff2.bind(i));
    }
};
const fff1 = () => {
    for (let i = 0; i < 10; ++i) {
        f3((err) => {
            console.log(i, err);
        });
    }
};
fff1();
return;
setInterval(()=> {
    for(let i = 0; i < 100000; ++i) {
        f2();
    }
}, 100);