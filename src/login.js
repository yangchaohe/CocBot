const { Bot, Message } = require('mirai-js');
Bot.sendCommand({
    // mirai-api-http 服务的网络位置
    baseUrl: 'http://localhost:7000',
    // 在 mirai-api-http 的配置中设置的 verifyKey
    verifyKey: 'yangchaohe',
    // 指令名
    command: '/login',
    // 指令参数列表，这条指令等价于 /login 1019933576 password
    args: ['2646377197', 'yyfilhjr1314'],
});
