/**
 * Created by Linqy on 2018\7\9 0009.
 * 测试nodejs效率
 */
const limit = 10000000;

// 字串拼接
// 结论: cpu毫无变化,放心使用
// 1.10000次/10ms== 10000*100次/秒,cpu毫无变化,放心使用
// 2.100000次/10ms == 100000*100次/秒,cpu毫无变化,放心使用
const testString = () => {
    let str1 = '模块的fork方法确实可以让我们很好的解决单线程对cpu密集型任务的阻塞问题，';
    let str2 = '代表不会阻塞，在主线程做过多的任务可能会导致主线程的卡死，影响整个程序的性能，所以我们要非常小心的处理大量的循环，字符串拼接和浮点运算等cpu密集型任务，合理的利用各种技术把任务丢给子线程或子进程去完成，保持Node.js主线程的畅通。';
    let str3 = str1 + str2;
};

// 浮点运算
// 结论: cpu毫无变化,放心使用
// 1.10000次/10ms== 10000*100次/秒,cpu毫无变化,放心使用
// 2.100000次/10ms == 100000*100次/秒,cpu毫无变化,放心使用
const testFloat = () => {
    let f1 = 192801.210213;
    let f2 = 90213854.92103983;
    let f3 = f1 + f2;
};

// 按位取反
// 结论:
// 1.10000次/10ms== 10000*100次/秒,cpu毫无变化,放心使用
// 2.100000次/10ms == 100000*100次/秒,cpu毫无变化,放心使用
let now = Date.now();
const testOperator = () => {
    // console.log(now, now / 1000);
    let time = ~~(now / 1000);
    // console.log(time);
};

// 取正
// 结论:
// 1.10000次/10ms== 10000*100次/秒,1%
// 2.100000次/10ms == 100000*100次/秒,cpu6%
const testOperator2 = () => {
    // console.log(now, now / 1000);
    let time = parseInt(now / 1000);
    // console.log(time);
};

const intMax = 0x7FFFFFFF;
const testOperator3 = (f) => {
    if (f > intMax) {
        return parseInt(f);
    } else {
        return ~~f;
    }
};

const o1 = {};
for (let i = 0; i < 50; ++i) {
    o1['i_'+i] = {};
    for (let j = 0; j < 200; ++j) {
        o1['i_'+i]['j_'+j] = {k:i+'_'+j, v: i*3000+j};
    }
}

// 100*3000:10次/秒， cpu4%
// 50*3000:10次/秒, cpu2.5%
// 50*2000:10次/秒, cpu2%
// 50*200:10次/秒, cpu0%
const testMapObject2 = () => {
    let count = 0;
    for (let k in o1) {
        for (let j in o1[k]) {
            if (o1[k][j].v % 5 === 0) {
                // console.log(o1[k][j].v);
                ++count;
            }
        }
    }
    // console.log(count);
};


const o2 = {};
const m = 2000, n = 30;
for (let i = 0; i < m; ++i) {//3000人
    o2['i_'+i] = {};
    for (let j = 0; j < n; ++j) {//30模块
        o2['i_'+i]['j_'+j] = {k:i+'_'+j, v: i*n+j};
    }
}
// 3000*30:10次/秒, cpu1%
// 2000*30:10次/秒, cpu1%
const testMapObject = () => {
    let count = 0;
    for (let k in o2) {
        for (let j in o2[k]) {
            if (o2[k][j].v % 5 === 0) {
                // console.log(o1[k][j].v);
                ++count;
            }
        }
    }
    // console.log(count);
};

// 对于对象是否存在的判定,可直接用之if (o2)
// 100000次/100ms, cpu0%
// 10000000次/100ms， cpu0~1%，各一半
const testObjectTrueOrFalse = () => {
    if (o2) {
        return true;
    }
    return false;
};
// 100000次/100ms, cpu0%
// 10000000次/100ms， cpu0~1%，各一半
const testObjectTrueOrFalse2 = () => {
    return undefined === o2;
};

setInterval(() => {
    for (let i = 0; i < limit; ++i) {
        testObjectTrueOrFalse2();
    }
}, 100);