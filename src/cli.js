const commander = require('commander'); // include commander in git clone of commander repo
const cli = new commander.Command();
cli.version('0.0.1');

function parseInt(value, dummyPrevious) {
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

cli
    .command('lay <level> [limit]')
    .description('随机获取一个大本营等级的阵型图和链接，limit 是数量');
cli
    .option('-w, --war', '获取当前部落战信息')
cli
    .command('league <num>')
    .description('获取当前部联赛信息, num = 场次');

cli.outputHelp({ error: true });

cli.parse(process.argv);

let l = cli.opts();
console.log(JSON.stringify(l));

console.log('test');