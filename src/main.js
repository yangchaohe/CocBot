const { Bot, Message, Middleware } = require('mirai-js');
const bot = new Bot();

const { log4js } = require('./log4js');
var log = log4js.getLogger('coc');

const { Layout } = require('./layout');
const layout = new Layout();

const fs = require('fs');
const axios = require('axios');
const url = require('url');
const { parseString } = require('xml2js');

const { Coc } = require('./coc');
const coc = new Coc('2Y9GLJC0Y');

const commander = require('commander'); // include commander in git clone of commander repo
const cmd = new commander.Command();
cmd.version('0.0.1');

cmd.name('coc');
cmd.exitOverride();

let leagueState;
let warState;
let checkWarTime;

// 连接到一个 mirai-api-http 服务
async function init() {
    log.info('开始初始化');
    log.info('接入 maria qq api ...');
    await bot.open({
        baseUrl: 'http://127.0.0.1:7000',
        verifyKey: 'yangchaohe',
        qq: 2646377197,
    })
    log.info('接入 maria qq api 成功');
    let flag = true;
    do {
        log.info('加载 coc 插件 ...');
        await coc.init()
            .then(() => {
                log.info('coc 插件加载成功, 部落数据加载完毕');
                flag = false;
            })
            .catch((e) => {
                log.error('载入 coc 插件失败，原因：%s', e);
            });
    } while (flag);
    log.info('初始化完毕');
    cocLog();
    setInterval(cocLog, 5 * 60 * 1000);
    checkWarTime = setInterval(warWarn, 60 * 60 * 1000);
}

async function start() {
    await init();

    cmd
    .command('lay')
    .argument('[level]', '[数字] 大本等级', myParseInt, 12)
    .argument('[limit]', '[数字] 数量', myParseInt, 1)
    .description('获取一个大本的阵型图和链接')
    .action(layout_);

    cmd
    .command('war')
    .description('获取部落战信息')
    .action(war);

    bot.on('GroupMessage',
        new Middleware()
            .textProcessor()
            .done(async ({ text, sender: { permission: permission, group: { id: group } } }) => {
                if (text.startsWith('co')) {
                    let cmd_arr = text.split(' ');
                    cmd_arr.unshift('node');
                    log.debug('cmd_arr: %s', JSON.stringify(cmd_arr));
                    try {
                        cmd.parse(cmd_arr);
                    } catch (error) {
                        log.debug('error: %s',error);
                        let message;
                        if (error.message == '(outputHelp)'){
                            message = cmd.helpInformation();
                        } else {
                            message = error.massage;
                        }
                        sendAndLog({
                            obj: 707075482,
                            mes: new Message().addPlain(error.message)
                        });
                    }
                }
                if (text.startsWith('/coc 部落战')) {
                }
                if (text.startsWith('/coc 联赛')) {
                }
                if (text.startsWith('/coc 积分')) {
                }
                if (text.startsWith('/coc help')) {
                    let message;
                    message = '/coc 阵型 <大本等级> [limit]\n'+
                            '/coc 上传阵型 <大本等级>\n'+
                            '/coc 联赛 <联赛场次>\n'+
                            '/coc 部落战\n'+
                            '/coc 积分 [id] [points]\n'+
                            '被动功能：\n'+
                            '1. 部落战快结束自动提示未进攻成员\n'+
                            '2. 成员进攻播报（缓冲10分钟）';
                    sendAndLog({
                        obj: group,
                        mes: new Message().addPlain(message)
                    });
                }
            })
    );

    bot.on('GroupMessage',
        new Middleware()
            .memberLock({ autoUnlock: true })
            .textProcessor()
            .syncWrapper()
            .done(async ({ waitFor, text, bot, sender: { id: member, memberName: memberName, group: { id: group } } }) => {
                if (text.includes('/coc 上传阵型')) {
                }
            })
    );

    bot.on('GroupMessage',
        new Middleware()
            .messageProcessor(['Plain', 'Image', 'Voice', 'Xml'])
            .done(async ({ classified, sender: { id: member, memberName: memberName, group: { id: group, name: name }} }) => {
                const { Plain, Image, Voice, Xml } = classified;
                Plain.forEach(v => { log.info('[%s(%s)] %s(%s) -> %s', name, group, memberName, member, v.text); });
                Image.forEach(v => { log.info('[%s(%s)] %s(%s) -> %s', name, group, memberName, member, JSON.stringify(v.image)); });
                Voice.forEach(v => { log.info('[%s(%s)] %s(%s) -> %s', name, group, memberName, member, JSON.stringify(v.voice)); });
                Xml.forEach(v => { log.info('[%s(%s)] %s(%s) -> %s', name, group, memberName, member, JSON.stringify(v.xml)); });
            })
    );
}

function isValidURL(url) {
    var urlRegExp = /^((https|http|ftp|rtsp|mms)?:\/\/)+[A-Za-z0-9]+\.[A-Za-z0-9]+[\/=\?%\-&_~@[\]\':+!]*([^<>\"\"])*$/;
    if (urlRegExp.test(url)) {
        return true;
    } else {
        return false;
    }
}

function isAccessUrl(url) {
    axios.get('https://baidu.com').then(() => true).catch(() => false);
}

function isCocLink(link) {
    if (isValidURL(link)) {
        return url.parse(link).hostname === 'link.clashofclans.com';
    }
    // if (!isAccessUrl(link)) {
    //     return false;
    // }
}

async function sendAndLog(option) {
    let { obj, mes } = option;
    await bot.sendMessage({
        group: obj,
        message: mes,
    });
    log.info(obj + ' <- ' + JSON.stringify(mes));
}

const download_image = (url, image_path) =>
    axios({
        url,
        responseType: 'stream',
    }).then(
        response =>
            new Promise((resolve, reject) => {
                response.data
                    .pipe(fs.createWriteStream(image_path))
                    .on('finish', () => resolve())
                    .on('error', e => reject(e));
            }),
    );

async function cocLog() {
    log.debug('启用战争数据日志、提醒');
    warLog();
    warWarn();
}

function warWarn() {
    if (!coc.clanWarExists) return;
    if (!coc.leagueExists) return;
    if (coc.warEndTime !== undefined && coc.warEndTime > new Date()) {
        let hour = Math.floor((coc.warEndTime - new Date()) / (60 * 60 * 1000));
        log.debug('计算战争时间..剩余 %d h', hour);
        if (hour <= 1) {
            clearInterval(checkWarTime);
            checkWarTime = setInterval(() => sendAndLog({
                obj: 707075482,
                mes: new Message().addPlain('战争结束据今时间： ' + diffTime(coc.warEndTime, new Date()) + '\n' +
                    '未进攻成员：' + coc.noAttackMembersInfo)
            }), 5 * 60 * 1000)
            return;
        }
        if (hour <= 2) {
            clearInterval(checkWarTime);
            checkWarTime = setInterval(() => sendAndLog({
                obj: 707075482,
                mes: new Message().addPlain('战争结束据今时间： ' + diffTime(coc.warEndTime, new Date()) + '\n' +
                    '未进攻成员：' + coc.noAttackMembersInfo)
            }), 20 * 60 * 1000)
            return;
        }
        if (hour <= 5) {
            sendAndLog({
                obj: 707075482,
                mes: new Message().addPlain('战争结束据今时间： ' + diffTime(coc.warEndTime, new Date()) + '\n' +
                    '未进攻成员：' + coc.noAttackMembersInfo)
            });
            return;
        }
    } else {
        log.info('没有进行战争或者无需提示！');
        return;
    }
}

function warLog() {
    log.debug(coc.diffMembers);
    if (coc.diffMembers !== undefined && coc.diffMembers.length !== 0) {
        coc.diffMembers.forEach((member, i) => {
            log.debug(member);
            member.attacks.forEach((attacks) => {
                log.debug(attacks);
                let message = '部落成员[' + member.name + ']发起了进攻！' + '\n'
                    + '----- 进攻数据 -----' + '\n'
                    + '星🌟：' + attacks.stars + '\n'
                    + '进攻时间：' + attacks.duration + ' s' + '\n'
                    + '摧毁百分比：' + attacks.destructionPercentage + ' %';
                coc.diffMembers.splice(i, 1);
                sendAndLog({
                    obj: 707075482,
                    mes: new Message().addPlain(message)
                })
            })
        })
    } else {
        log.debug('当前没有新的战斗数据！');
    }
    return;
}

function diffTime(date1, date2) {
    let oDate1 = date1;
    let oDate2 = date2;
    let nTime = oDate1.getTime() - oDate2.getTime();
    let day = Math.floor(nTime / 86400000);
    let hour = Math.floor(nTime % 86400000 / 3600000);
    let minute = Math.floor(nTime % 86400000 % 3600000 / 60000);
    if (day == 0) {
        if (hour == 0) {
            if (minute == 0) {
                return 0 + ' min ';
            }
            return minute + ' min ';
        }
        return hour + ' h ' + minute + ' min ';
    }
    return day + ' day ' + hour + ' h ' + minute + ' min ';
}

function layout_(level, limit) {
    let message;
    lay = layout.getLayout(level, limit);
    message = new Message();
    log.debug(lay);
    if (Array.isArray(lay) && lay.length === 0) {
        message = message.addPlain('没有该数据！');
    } else {
        lay.forEach(e => {
            message = message.addImagePath(e.imgPath).addPlain(e.link);
        });
    }
    sendAndLog({
        obj: 707075482,
        mes: message,
    });
}

async function uploadLayout(level, waitFor) {
    level = parseInt(level);
    if (!typeof (level) === 'number') {
        sendAndLog({
            obj: group,
            mes: new Message().addPlain('指令错误! \n正确用法：「/coc 上传阵型 数字」'),
        })
        return;
    }
    sendAndLog({
        obj: group,
        mes: new Message().addPlain('请输入该阵型的图片'),
    });
    sendAndLog({
        obj: group,
        mes: new Message().addPlain('注意：上传阵型必选世界类型、图片和链接。'),
    })
    const image = await waitFor.messageChain();
    const { url: imgUrl } = await image[1];
    sendAndLog({
        obj: group,
        mes: new Message().addPlain('请输入该阵型的链接'),
    });
    do {
        var link = await waitFor.messageChain();
        if (link[1].type == 'Xml') {
            xml = link[1].xml;
            parseString(xml, function (err, result) { link = result.msg.$.url; });
        } else if (link[1].type == 'Plain') {
            link = link[1].text;
        } else if (link === 'exit') {
            return;
        } else {
            log.debug(link);
            sendAndLog({
                obj: group,
                mes: new Message().addPlain('debug 1')
            })
        }
        if (!isCocLink(link)) {
            sendAndLog({
                obj: group,
                mes: new Message().addPlain('链接格式错误或者无法访问！请重试！(exit退出)'),
            });
        }
    } while (!isCocLink(link));
    do {
        sendAndLog({
            obj: group,
            mes: new Message().addPlain('请输入该阵型的类型（主世界，部落战，夜世界）'),
        });
        var type = await waitFor.text();
    } while (!['主世界', '部落战', '夜世界'].includes(type))
    // download
    let auth = memberName + '-' + member.toString();
    let imgPath = 'resources/'
        + 'layout/'
        + 'Level'
        + level
        + '/'
        + auth
        + '-'
        + new Date().getTime().toString()
        + '.jfif';
    await download_image(imgUrl, imgPath);
    layout.addLayout({ level, imgPath, type, link, auth });
    sendAndLog({
        obj: group,
        mes: new Message().addPlain('阵型上传完毕。\n感谢分享！'),
    });
}

async function war(){
    if (!coc.clanWarExists) {
        sendAndLog({
            obj: 707075482,
            mes: new Message().addPlain('当前没有开启部落战'),
        });
        return;
    }
    sendAndLog({
        obj: 707075482,
        mes: new Message().addPlain(coc.clanWarInfo),
    });
}

async function league(num){
    num = parseInt(num);
    let infos;
    if (leagueState == undefined) {
        sendAndLog({
            obj: group,
            mes: new Message().addPlain('正在为您查询中，请稍等'),
        });
        infos = await coc.getClanWarLeagueState('#2Y9GLJC0Y');
        leagueState = infos;
    } else {
        infos = leagueState;
    }
    if (!Number.isNaN(num) && typeof (num) === 'number') {
        let info = infos[num - 1];
        sendAndLog({
            obj: group,
            mes: new Message().addPlain('第' + (num) + '场战斗\n').addPlain(info),
        });
    } else if (Array.isArray(infos)) {
        for (let i = 0; i < infos.length; i++) {
            const info = infos[i];
            sendAndLog({
                obj: group,
                mes: new Message().addPlain('第' + (i + 1) + '场战斗\n').addPlain(info),
            })
        }
    } else {
        sendAndLog({
            group,
            message: new Message().addPlain('未知错误'),
        })
    }
}

function point(id, points){
    id = parseInt(id);
    points = parseInt(points);

    let pointList = coc.showPoints();

    if (!Number.isNaN(id) && typeof (id) === 'number'){

        if (id > pointList.length) {
            sendAndLog({
                obj: group,
                mes: new Message().addPlain('Out of range!'),
            });
        }
        if (Number.isNaN(points) || typeof (points) !== 'number'){
            sendAndLog({
                obj: group,
                mes: new Message().addPlain(id + '. ' + pointList[id].name + ': ' + pointList[id].point),
            });
        } else {
            if (permission == Bot.groupPermission.MEMBER) {
                sendAndLog({
                    obj: group,
                    mes: new Message().addPlain('您没有相关权限设置'),
                });
                return;
            }
            coc.addPoints(id, points);
            sendAndLog({
                obj: group,
                mes: new Message().addPlain('积分设置完成'),
            });
        }
    } else {
        let messageArr = [];
        pointList.forEach((mp, index) => {
            let str = index + '. ' + mp.name + ': ' + mp.point;
            messageArr.push(str);
        });
        sendAndLog({
            obj: group,
            mes: new Message().addPlain(messageArr.join('\n')),
        })
    }
}
function myParseInt(value, dummyPrevious) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        sendAndLog({
            obj: 707075482,
            mes: new Message().addPlain('Not a numer')
        });
        return;
    }
    return parsedValue;
}
start();
