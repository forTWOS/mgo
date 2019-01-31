/**
 * Created by Linqy on 2018\7\9 0009.
 */
const f1 = (id) => {
    // console.log(id);
    return (err) => {
        let tid = id+err;
        // console.log(tid);
    };
};

const f3 = (f) => {
    f('err');
};
// %2(多)-%3 推荐
const f2 = () => {
    for (let i = 0; i < 10; ++i) {
        f3(f1(i));
    }
};
const ff2 = (id, err) => {
    let tid = id+err;
    // console.log(tid);
};
// 2%-3%(多)
const ff1 = () => {
    for (let i = 0; i < 10; ++i) {
        f3(ff2.bind(null, i));
    }
};
// 2%-3%-4%
const fff1 = () => {
    for (let i = 0; i < 10; ++i) {
        f3((err) => {
            let tid = i+err;
            // console.log(i, err);
        });
    }
};
// f2();return;
// ff1();return;
// fff1(); return;
setInterval(()=> {
    for(let i = 0; i < 100000; ++i) {
        fff1();
    }
}, 100);