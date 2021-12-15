const { Client } = require('clashofclans.js');
const { diff } = require('objectdiff');
const { log4js } = require('./log4js');
var log = log4js.getLogger('coc');
const fs = require('fs');

// const proxy = require("node-global-proxy").default;
// proxy.setConfig({
//   http: "http://localhost:8888",
//   https: "http://localhost:8888",
// });
// proxy.start();

// var globalTunnel = require('global-tunnel-ng');

// globalTunnel.initialize({
//   connect: 'both',
//   host: '127.0.0.1',
//   port: 8888,
//   proxyAuth: '', // optional authentication
//   sockets: 1089 // optional pool size for each http and https
// });

class Coc {

	// war info
	clanWarExists = false;
	leagueExists = false;

	_clanWarData;
	_leagueData;

	_warEndTime;
	_noAttackMembers = [];
	_inWarMembers = [];
	diffMembers = [];

	clanWarInfo = '';
	leagueInfo = [];
	noAttackMembersInfo = '';

	// point info
	_memberPoints = JSON.parse(fs.readFileSync('/home/admin/QQ_Bot/mcl/clashOfClans/resources/point.json', 'utf-8').toString())

	constructor(clanTag) {
		this._clanTag = clanTag;
	}

	/**
	 * 初始化部落信息
	 */
	async init() {
		this.client = new Client();
		await this.client.init({ email: 'manu2x@qq.com', password: 'Yy123456' });
		await this._warInit();
		// setInterval(this._warInit, 5 * 60 * 1000);
	}

	/**
	 * 初始化战争、联赛详细信息
	 */
	async _warInit() {
		// clan war
		this._clanWarData = await this.client.currentClanWar(this._clanTag);
		if (this._clanWarData.state != 'notInWar' && this._clanWarData.state != 'warEnded') {
			this.clanWarExists = true;
			this._setClanWarInfo();
		}
		// league
		let CWL;
		// do: 防止网络原因造成 CWL 没有数据
		do {
			CWL = await this.client.clanWarLeague(this._clanTag);
			log.debug('CWL: ', JSON.stringify(CWL).toString());
			if (CWL.statusCode === 404) break;
		} while (CWL.ok === false);
		if (CWL.state != 'notInWar' && CWL.statusCode != 404) {
			this.leagueExists = true;
			await this._setLeagueData(CWL);
		}
	}


	/**
	 * **部落战** 信息
	 */
	_setClanWarInfo() {
	    this.clanWarInfo = this._getWarInfo(this._clanWarData);
	}

	// 部落的联赛机制是先生成8场数据，4场战斗中，4场备战，都有自己的tag
	// 这 8 场数据可以使用 clanTag 获取，战斗数据只能通过 warTag 获取

	/**
	 * 联赛 数据
	 * @param {object} CWL
	 */
	async _setLeagueData(CWL) {
		let rounds;
		rounds = CWL.rounds;

		if (rounds === undefined) {
			log.debug('round is undefined');
			return;
		}

		log.debug('round：', JSON.stringify(rounds).toString());

		var that = this;

		// foreach 与 async 冲突
		for (let i = 0; i < rounds.length; i++) {
			const round = rounds[i];
			for (let j = 0; j < round.warTags.length; j++) {
				const warTag = round.warTags[j];
				log.debug('round %d -> warTag %d：%s', i, j, warTag)
				if (warTag === '#0') {
					continue;
				}
				let war;
				do {
					war = await that.client.clanWarLeagueWar(warTag);
					log.debug('round %d -> warData %d：%s', i, j, JSON.stringify(war).toString())
				} while (war.ok === false)
				if (war.state == 'notInWar') { continue; }

				this._leagueData.push(war);
			}
		}

		this._leagueData.forEach(league => {
			if (league.clan.tag == this._clanTag) {
				this.leagueInfo.push(this._getWarInfo(league));
			}
			if (league.opponent.tag == this._clanTag) {
				this.leagueInfo.push(this._getWarOpponentInfo(league));
			}
		})
	}

	/**
	 * 将 this._noAttackMembers 转换为
	 * 1. member1
	 * 2. member2
	 *
	 * @param {array} clanWarMembers
	 */
	_setNoAttackMembersData(clanWarMembers) {
		log.debug('clanWarMembers: %s', clanWarMembers);
		this._noAttackMembers = clanWarMembers.filter((mem) => {
			if (!mem.attacks) {
				return true;
			}
		});
		let str = '';
		this._noAttackMembers.sort((a, b) => a.mapPosition - b.mapPosition);
		this._noAttackMembers.forEach((mem, i) => {
			str += `${i+1}. ${mem.name} (${mem.townhallLevel}本)\n`;
		});
		this.noAttackMembersInfo = str.slice(0, str.length - 1);
	}

	stateCN(state) {
		switch (state) {
			case 'notInWar':
				state = '尚未开始';
				break;
			case 'preparation':
				state = '备战中';
				break;
			case 'inWar':
				state = '战斗中';
				break;
			case 'warEnded':
				state = '已结束';
		}

		return state;
	}

	_getWarInfo(data) {
		return this._warBaseInfo(data) + this._warInfo(data);
	}

	_getWarOpponentInfo(data) {
		return this._warBaseInfo(data) + this._warOpponentInfo(data);
	}

	_warBaseInfo(data) {
		log.debug('解析部落基本信息，传入参数为：%s', JSON.stringify(data).toString());
		if (data.state != 'notInWar') {
			this._warEndTime = this.parseDate(data.endTime);
		}
		return '----- 基础信息 ------' + '\n'
			+ '状态：' + this.stateCN(data.state) + '\n'
			+ '人数：' + data.teamSize + '\n'
			+ '开始时间：' + this.parseDate(data.startTime).toLocaleString() + '\n'
			+ '备战时间：' + this.parseDate(data.preparationStartTime).toLocaleString() + '\n'
			+ '结束时间：' + this.parseDate(data.endTime).toLocaleString() + '\n'
	}

	_warInfo(data) {
		if (data.state != 'notInWar') {
			this._inWarMembers = data.clan.members;
			this._setNoAttackMembersData(data.clan.members);
			this._diffWarMember(data.clan.members);
		}
		if (data.state == 'preparation') {
			return '----- 我方数据 ------' + '\n'
				+ '参与成员：' + this.noAttackMembersInfo + '\n'
		}
		return '----- 我方数据 ------' + '\n'
			+ '进攻次数🗡️：' + data.clan.attacks + '\n'
			+ '星数🌟：' + data.clan.stars + '\n'
			+ '摧毁百分比：' + data.clan.destructionPercentage + '%\n'
			+ '未进攻的成员：' + this.noAttackMembersInfo + '\n'
			+ '----- 敌方数据 ------' + '\n'
			+ '进攻次数🗡️：' + data.opponent.attacks + '\n'
			+ '星数🌟：' + data.opponent.stars + '\n'
			+ '摧毁百分比：' + data.opponent.destructionPercentage + '%';
	}

	_warOpponentInfo(data){
		if (data.state != 'notInWar') {
			this._inWarMembers = data.opponent.members;
			this._setNoAttackMembersData(data.opponent.members);
			this._diffWarMember(data.opponent.members);
		}
		if (data.state == 'preparation') {
			return '----- 我方数据 ------' + '\n'
				+ '参与成员：' + this.noAttackMembersInfo + '\n'
		}
		return '----- 我方数据 ------' + '\n'
			+ '进攻次数🗡️：' + data.opponent.attacks + '\n'
			+ '星数🌟：' + data.opponent.stars + '\n'
			+ '摧毁百分比：' + data.opponent.destructionPercentage + '%\n'
			+ '未进攻的成员：' + this.noAttackMembersInfo + '\n'
			+ '----- 敌方数据 ------' + '\n'
			+ '进攻次数🗡️：' + data.clan.attacks + '\n'
			+ '星数🌟：' + data.clan.stars + '\n'
			+ '摧毁百分比：' + data.clan.destructionPercentage + '%';
	}

	parseDate(str) {
		log.debug('解析部落时间，传入参数为：%s', str);
		let date = [];
		date.push(str.substr(0, 4));
		date.push(str.substr(4, 2));
		date.push(str.substr(6, 3));
		let time = [];
		time.push(str.substr(9, 2));
		time.push(str.substr(11, 2));
		time.push(str.substr(13, 2));
		let area = str.substr(15);

		return new Date(Date.parse(date.join('-') + time.join(':') + area));
	}

	_diffWarMember(currentWarMembers) {
		if (this._inWarMembers.length === 0) {
			return;
		}
		currentWarMembers.forEach((newMember, i) => {
			log.debug('旧成员数据：%s', JSON.stringify(this._inWarMembers[i]).toString());
			log.debug('新成员数据：%s', JSON.stringify(newMember).toString());
			let diffData = diff(this._inWarMembers[i], newMember);
			log.debug('diff成员数据：%s', JSON.stringify(diffData).toString());
			if (diffData.changed === 'equal') {
				return;
			}
			if (diffData.value.attacks != undefined) {
				if (diffData.value.attacks.changed != 'equal') {
					diffData.value.attacks.value.forEach((e) => {
						this.diffMembers.push({ name: newMember.name, attacks: e });
					})
				}
				return;
			}
		});
	}

	async initPoint() {
		let member_list = (await this.client.clanMembers(this._clanTag)).items;
		let write_data = [];
		member_list.forEach((member) => {
			let name = member.name;
			let tag = member.tag;
			let point = 0;
			write_data.push({ name, tag, point })
		});
		fs.writeFileSync('/home/manu/QQ-rebot/mcl/clashOfClans/resources/point.json', JSON.stringify(write_data));
	}

	addPoints(id, points) {
		this._memberPoints[id].point += points;
		fs.writeFileSync('/home/manu/QQ-rebot/mcl/clashOfClans/resources/point.json', JSON.stringify(this._memberPoints));
		return true;
	}

	showPoints() {
		return this._memberPoints;
	}

	/**
	 * @param x {Object} 对象1
	 * @param y {Object} 对象2
	 * @return  {Boolean} true 为相等，false 为不等
	 */
	deepEqual = (x, y) => {
		// 指向同一内存时
		if (x === y) {
			return true;
		} else if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
			if (Object.keys(x).length !== Object.keys(y).length) {
				return false;
			}
			for (var prop in x) {
				if (y.hasOwnProperty(prop)) {
					if (!this.deepEqual(x[prop], y[prop])) return false;
				} else {
					return false;
				}
			}
			return true;
		} else {
			return false;
		}
	}
}

// (async function() {
// 	const a = new Coc('2Y9GLJC0Y');
// 	a.init();
// })();
module.exports = { Coc };
