const commander = require('commander'); // include commander in git clone of commander repo
const coc = new commander.Command();
coc.version('0.0.1');

function myParseInt(value, dummyPrevious) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new commander.InvalidArgumentError('Not a number.');
    }
    return parsedValue;
}

function increaseVerbosity(dummyValue, previous) {
    return previous + 1;
}

function collect(value, previous) {
    return previous.concat([value]);
}

function commaSeparatedList(value, dummyPrevious) {
    return value.split(',');
}

coc.name('coc');
coc
    .command('lay')
    .argument('[level]', '[数字] 大本等级', myParseInt, 12)
    .argument('[limit]', '[数字] 数量', myParseInt, 1)
    .option('-i, --info', 'test')
    .description('获取一个大本的阵型图和链接')
    .action(test);
coc
    .option('-W, --War', '获取当前部落战信息');
coc
    .command('league <num>')
    .description('获取当前部联赛信息, num = 场次');

// coc.outputHelp({ error: true });
coc.exitOverride();
try {
    coc.parse(process.argv);
} catch (error) {
    console.log(coc.helpInformation());
}

let l = coc.opts();
console.log(JSON.stringify(l));

console.log('test');

function test(level, limit){console.log('level: %d, limit: %d', level, limit)}