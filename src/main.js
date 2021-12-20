const { Bot, Message, Middleware } = require('mirai-js');
const bot = new Bot();

const { log4js } = require('./log4js');
var log = log4js.getLogger('coc');

const { Layout } = require('./layout');
const _layout = new Layout();

const fs = require('fs');
const axios = require('axios');
const url = require('url');
const { parseString } = require('xml2js');

const { Coc } = require('./coc');
const coc = new Coc('2Y9GLJC0Y');

const commander = require('commander'); // include commander in git clone of commander repo
const co = new commander.Command();
co.version('1.0.1');

co.name('co');
co.exitOverride();

let main = {
    group: 707075482,
    wf: undefined,
    unlock: undefined,
    sender: undefined,
    senderName: undefined,
    setGroup: function (v) {
        log.debug(`set main.group = ${v}`);
        main.group = v;
    },
    setWf: function (v) {
        log.debug(`set main.wf = ${v}`);
        main.wf = v;
    },
    setUnlock: function (v) {
        log.debug(`set main.unlock = ${v}`);
        main.unlock = v;
    },
    setSenderName: function (v) {
        log.debug(`set main.senderName = ${v}`);
        main.senderName = v;
    },
    setSender: function (v) {
        log.debug(`set main.sender = ${v}`);
        main.sender = v;
    },

    getGroup: function (){
        log.debug(`get main.group = ${main.group}`);
        return main.group;
    },
    getWf: function (){
        log.debug(`get main.wf = ${main.wf}`);
        return main.wf;
    },
    getUnlock: function (){
        log.debug(`get main.unlock = ${main.unlock}`);
        return main.unlock;
    },
    getSenderName: function (){
        log.debug(`get main.senderName = ${main.senderName}`);
        return main.senderName;
    },
    getSender: function (){
        log.debug(`get main.sender = ${main.sender}`);
        return main.sender;
    }
};

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

    co
        .command('lay')
        .description('获取一个大本的阵型图和链接')
        .argument('[level]', '[数字] 大本等级', myParseInt, 12)
        .argument('[limit]', '[数字] 数量', myParseInt, 1)
        .action(layout);

    co
        .command('war')
        .description('获取部落战信息')
        .action(war);

    co
        .command('point')
        .description('积分')
        .option('-S, --set', '设置成员的积分值')
        .option('-s, --show', '显示成员的积分值')
        .option('-i, --init', '初始化成员的积分值')
        .option('-a, --auto-add', '自动为新成员增加积分选项')
        .action(point);
    co
        .command('ulay')
        .description('分享自己的阵型')
        .action(uploadLayout);

    co
        .configureOutput({
            // 此处使输出变得容易区分
            writeOut: (str) => sendGrp({
                mes: new Message().addPlain(`${str}`)
            }),
            writeErr: (str) => sendGrp({
                mes: new Message().addPlain(`${str}`)
            }),
            // 将错误高亮显示
            // outputError: (str, write) => write(errorColor(str))
        });

    bot.on('GroupMessage',
        new Middleware()
            .memberLock({autoUnlock: true})
            .syncWrapper()
            .textProcessor()
            .done(async ({ waitFor, text, sender: { id: sender, memberName: senderName, permission: permission, group: { id: group } } }) => {

                main.setGroup(group);
                main.setWf(waitFor);
                main.setSenderName(senderName);
                main.setSender(sender);
                text = text.trim();

                if (text.startsWith('co point') && !checkIsAdmin(sender)) {
                    sendGrp({
                        mes: new Message().addPlain('Permission Not Access!')
                    });
                    return;
                }

                if (text.startsWith('co')) {
                    let co_arr = text.split(/\s+/);
                    co_arr.unshift('node');
                    log.debug('co_arr: %s', JSON.stringify(co_arr));
                    try {
                        co.parse(co_arr);
                    } catch (error) {
                        log.error('co_error: %s',error);
                    }
                }
                if (text.startsWith('/coc 联赛')) {
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
                    sendGrp({
                        mes: new Message().addPlain(message)
                    });
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

async function sendGrp(option) {
    let { mes } = option;
    await bot.sendMessage({
        group: main.group,
        message: mes,
    });
    log.info(main.group + ' <- ' + JSON.stringify(mes));
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
    log.debug('启动战争进攻数据日志、结束警告');
    warLog();
    warWarn();
}

function warWarn() {
    let warFlag = false;
    log.info('检查是否需要战争警告...');
    if (coc.clanWarExists) {
        log.info('存在部落战');
        warFlag = true;
    }
    if (coc.leagueExists) {
        log.info('存在联赛');
        warFlag = true;
    }
    if (coc.warEndTime !== undefined && coc.warEndTime > new Date() && warFlag) {
        let hour = Math.floor((coc.warEndTime - new Date()) / (60 * 60 * 1000));
        log.debug('计算战争时间..剩余 %d h', hour);
        if (hour <= 1) {
            clearInterval(checkWarTime);
            checkWarTime = setInterval(() => sendGrp({
                mes: new Message().addPlain('战争结束据今时间： ' + diffTime(coc.warEndTime, new Date()) + '\n' +
                    '未进攻成员：' + coc.noAttackMembersInfo)
            }), 5 * 60 * 1000)
            return;
        }
        if (hour <= 2) {
            clearInterval(checkWarTime);
            checkWarTime = setInterval(() => sendGrp({
                mes: new Message().addPlain('战争结束据今时间： ' + diffTime(coc.warEndTime, new Date()) + '\n' +
                    '未进攻成员：' + coc.noAttackMembersInfo)
            }), 20 * 60 * 1000)
            return;
        }
        if (hour <= 5) {
            sendGrp({
                mes: new Message().addPlain('战争结束据今时间： ' + diffTime(coc.warEndTime, new Date()) + '\n' +
                    '未进攻成员：' + coc.noAttackMembersInfo)
            });
            return;
        }
    } else if (warFlag){
        let hour = Math.floor((coc.warEndTime - new Date()) / (60 * 60 * 1000));
        log.info('计算战争时间..剩余 %d h, 无需警告', hour);
    } else {
        log.info('无需警告');
    }
}

function warLog() {
    log.info('检查战斗数据');
    if (coc.diffMembers !== undefined && coc.diffMembers.length !== 0) {
        log.info(`发现 ${coc.diffMembers.length} 个战斗数据，开始解析...`);
        let message;
        coc.diffMembers.forEach((member, i) => {
            member.attacks.forEach((attacks) => {
                message += '部落成员[' + member.name + ']发起了进攻！' + '\n'
                    + '----- 进攻数据 -----' + '\n'
                    + '星🌟：' + attacks.stars + '\n'
                    + '进攻时间：' + attacks.duration + ' s' + '\n'
                    + '摧毁百分比：' + attacks.destructionPercentage + ' %' + '\n';
                coc.diffMembers.splice(i, 1);
            });
        });
        log.info('解析完毕，发送数据');
        sendGrp({
            mes: new Message().addPlain(message)
        })
        return;
    }
    log.info('没有新的战斗数据');
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

function layout(level, limit) {
    let message;
    lay = _layout.getLayout(level, limit);
    message = new Message();
    log.debug(lay);
    if (Array.isArray(lay) && lay.length === 0) {
        message = message.addPlain('没有该数据！');
    } else {
        lay.forEach(e => {
            message = message.addImagePath(e.imgPath).addPlain(e.link);
        });
    }
    sendGrp({
        mes: message,
    });
}

async function uploadLayout() {
    sendGrp({
        mes: new Message().addPlain('请输入上传阵型的大本等级'),
    })
    let level = await main.wf.text();
    level = myParseInt(level);
    sendGrp({
        mes: new Message().addPlain('请输入该阵型的图片'),
    });
    sendGrp({
        mes: new Message().addPlain('注意：上传阵型必选世界类型、图片和链接。'),
    })
    const image = await main.wf.messageChain();
    const { url: imgUrl } = await image[1];
    sendGrp({
        mes: new Message().addPlain('请输入该阵型的链接'),
    });
    do {
        var link = await main.wf.messageChain();
        if (link[1].type == 'Xml') {
            xml = link[1].xml;
            parseString(xml, function (err, result) { link = result.msg.$.url; });
        } else if (link[1].type == 'Plain') {
            link = link[1].text;
        } else if (link === 'exit') {
            return;
        } else {
            log.debug(link);
            sendGrp({
                mes: new Message().addPlain('debug 1')
            })
        }
        if (!isCocLink(link)) {
            sendGrp({
                mes: new Message().addPlain('链接格式错误或者无法访问！请重试！(exit退出)'),
            });
        }
    } while (!isCocLink(link));
    do {
        sendGrp({
            mes: new Message().addPlain('请输入该阵型的类型（主世界，部落战，夜世界）'),
        });
        var type = await main.wf.text();
    } while (!['主世界', '部落战', '夜世界'].includes(type))
    // download
    let auth = main.senderName + '-' + main.sender;
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
    _layout.addLayout({ level, imgPath, type, link, auth });
    sendGrp({
        mes: new Message().addPlain('阵型上传完毕。\n感谢分享！'),
    });
}

async function war(){
    if (!coc.clanWarExists) {
        sendGrp({
            mes: new Message().addPlain('当前没有开启部落战'),
        });
        return;
    }
    sendGrp({
        mes: new Message().addPlain(coc.clanWarInfo),
    });
}

async function league(num){
    num = parseInt(num);
    let infos;
    if (leagueState == undefined) {
        sendGrp({
            mes: new Message().addPlain('正在为您查询中，请稍等'),
        });
        infos = await coc.getClanWarLeagueState('#2Y9GLJC0Y');
        leagueState = infos;
    } else {
        infos = leagueState;
    }
    if (!Number.isNaN(num) && typeof (num) === 'number') {
        let info = infos[num - 1];
        sendGrp({
            mes: new Message().addPlain('第' + (num) + '场战斗\n').addPlain(info),
        });
    } else if (Array.isArray(infos)) {
        for (let i = 0; i < infos.length; i++) {
            const info = infos[i];
            sendGrp({
                mes: new Message().addPlain('第' + (i + 1) + '场战斗\n').addPlain(info),
            })
        }
    } else {
        sendGrp({
            message: new Message().addPlain('未知错误'),
        })
    }
}

async function point(options){
    log.debug('point options: %s', JSON.stringify(options));

    // id = parseInt(id);
    // points = parseInt(points);

    // let pointList = coc.showPoints();

    // if (!Number.isNaN(id) && typeof (id) === 'number'){

    //     if (id > pointList.length) {
    //         sendGrp({
    //             mes: new Message().addPlain('Out of range!'),
    //         });
    //     }
    //     if (Number.isNaN(points) || typeof (points) !== 'number'){
    //         sendGrp({
    //             mes: new Message().addPlain(id + '. ' + pointList[id].name + ': ' + pointList[id].point),
    //         });
    //     } else {
    //         if (permission == Bot.groupPermission.MEMBER) {
    //             sendGrp({
    //                 mes: new Message().addPlain('您没有相关权限设置'),
    //             });
    //             return;
    //         }
    //         coc.addPoints(id, points);
    //         sendGrp({
    //             mes: new Message().addPlain('积分设置完成'),
    //         });
    //     }
    // } else {
    //     let messageArr = [];
    //     pointList.forEach((mp, index) => {
    //         let str = index + '. ' + mp.name + ': ' + mp.point;
    //         messageArr.push(str);
    //     });
    //     sendGrp({
    //         mes: new Message().addPlain(messageArr.join('\n')),
    //     })
    // }
}
function myParseInt(value, dummyPrevious) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new commander.InvalidArgumentError('Not a number.');
    }
    return parsedValue;
}

/**
 * @description 检查是否有管理员权限
 * @param {number} sender_id
 * @returns {boolean}
 */
function checkIsAdmin(sender_id) {
    let admin = [2633650083, 3036743631];
    log.debug(`checkIsAdmin: ${sender_id}->${admin.includes(sender_id)}`);
    return admin.includes(sender_id);
}

start();
