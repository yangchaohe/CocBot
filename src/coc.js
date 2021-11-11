const { Client } = require('clashofclans.js');
const { diff } = require('objectdiff');
const { log4js } = require('./log4js');
var log = log4js.getLogger('coc');
const fs = require('fs');

const {bootstrap} = require('global-agent');
bootstrap();

class Coc {
	constructor() {
		this.endTime;
		this.noAttackMembers;
		this.inWarMembersInfo = [];
		this.diffMembersInfo = [];
		this.memberPointList = JSON.parse(fs.readFileSync('/home/manu/QQ-rebot/mcl/clashOfClans/resources/point.json', 'utf-8').toString())
	}
	async init() {
		this.client = new Client();
		await this.client.init({ email: 'manu2x@qq.com', password: 'Yy123456' });
	}
	async getClanWarState(clanTag) {
		let data = await this.client.currentClanWar(clanTag);
		if (data.state == 'notInWar') {
			return false;
		}
		return this.getWarState(data);
	}
	getNoAttackMembers(clanWarMembers) {
		let noAttackMembers = clanWarMembers.filter((mem) => {
			if (!mem.attacks) {
				return true;
			}
		});
		let str = '';
		noAttackMembers.forEach(mem => {
			str += mem.name + ',';
		});
		return str.slice(0, str.length - 1);
	}

	async getClanWarLeagueState(clanTag) {
		let CWL;
		do {
			CWL = await this.client.clanWarLeague(clanTag);
			log.debug('CWL: ', JSON.stringify(CWL).toString());
		} while (CWL.ok === false);
		if (CWL.state == 'notInWar') {
			return false;
		}
		// data.clans: 参赛部落
		// data.rounds：比赛tag
		let state = await this.getRoundClanState(CWL.rounds, clanTag);
		return state;
	}

	// 部落的联赛机制是先生成8场数据，4场战斗中，4场备战，都有自己的tag
	// 这 8 场数据可以使用 clanTag 获取，战斗数据只能通过 warTag 获取
	/**
	 * 从 rounds 里找到关于 clanTag 的数据
	 * @param {*} rounds
	 * @param {*} clanTag
	 * @returns
	 */
	async getRoundClanState(rounds, clanTag) {
		if (rounds === undefined) {
			log.debug('round is undefined');
		}
		log.debug('round：', JSON.stringify(rounds).toString())
		var that = this;
		var state = [];
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
				if (war.clan.tag == clanTag) {
					state.push(that.getWarState(war));
				}
				if (war.opponent.tag == clanTag) {
					state.push(that.getWarOpponentState(war));
				}
			}
		}
		return state;
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

	getWarState(data) {
		return this.warBaseInfo(data) + this.warInfo(data);
	}

	getWarOpponentState(data) {
		return this.warBaseInfo(data) + this.warInfo(data, true);
	}

	warBaseInfo(data) {
		log.debug('解析部落基本信息，传入参数为：%s', JSON.stringify(data).toString());
		if (data.state == 'inWar') {
			this.endTime = this.parseDate(data.endTime);
		}
		return '----- 基础信息 ------' + '\n'
			+ '状态：' + this.stateCN(data.state) + '\n'
			+ '人数：' + data.teamSize + '\n'
			+ '开始时间：' + this.parseDate(data.startTime).toLocaleString() + '\n'
			+ '备战时间：' + this.parseDate(data.preparationStartTime).toLocaleString() + '\n'
			+ '结束时间：' + this.parseDate(data.endTime).toLocaleString() + '\n'
	}

	warInfo(data, isOpponent) {
		if (isOpponent == true) {
			if (data.state == 'inWar') {
				this.noAttackMembers = this.getNoAttackMembers(data.opponent.members);
				this.diffWarMember(data.opponent.members);
				this.inWarMembersInfo = data.opponent.members;
			}
			return '----- 我方数据 ------' + '\n'
				+ '进攻次数🗡️：' + data.opponent.attacks + '\n'
				+ '星数🌟：' + data.opponent.stars + '\n'
				+ '摧毁百分比：' + data.opponent.destructionPercentage + '%\n'
				+ '未进攻的成员：' + this.getNoAttackMembers(data.opponent.members) + '\n'
				+ '----- 敌方数据 ------' + '\n'
				+ '进攻次数🗡️：' + data.clan.attacks + '\n'
				+ '星数🌟：' + data.clan.stars + '\n'
				+ '摧毁百分比：' + data.clan.destructionPercentage + '%'
		} else {
			if (data.state == 'inWar') {
				this.noAttackMembers = this.getNoAttackMembers(data.clan.members);
				this.diffWarMember(data.clan.members);
				this.inWarMembersInfo = data.clan.members;
			}
			return '----- 我方数据 ------' + '\n'
				+ '进攻次数🗡️：' + data.clan.attacks + '\n'
				+ '星数🌟：' + data.clan.stars + '\n'
				+ '摧毁百分比：' + data.clan.destructionPercentage + '%\n'
				+ '未进攻的成员：' + this.getNoAttackMembers(data.clan.members) + '\n'
				+ '----- 敌方数据 ------' + '\n'
				+ '进攻次数🗡️：' + data.opponent.attacks + '\n'
				+ '星数🌟：' + data.opponent.stars + '\n'
				+ '摧毁百分比：' + data.opponent.destructionPercentage + '%'
		}
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

	diffWarMember(currentWarMembers) {
		if (this.inWarMembersInfo.length === 0) {
			return;
		}
		currentWarMembers.forEach((newMember, i) => {
			log.debug('旧成员数据：%s', JSON.stringify(this.inWarMembersInfo[i]).toString());
			log.debug('新成员数据：%s', JSON.stringify(newMember).toString());
			let diffData = diff(this.inWarMembersInfo[i], newMember);
			log.debug('diff成员数据：%s', JSON.stringify(diffData).toString());
			if (diffData.changed === 'equal') {
				return;
			}
			if (diffData.value.attacks != undefined) {
				if (diffData.value.attacks.changed != 'equal') {
					diffData.value.attacks.value.forEach((e) => {
						this.diffMembersInfo.push({ name: newMember.name, attacks: e });
					})
				}
				return;
			}
		});
	}

	async initPoint(clanTag) {
		let member_list = (await this.client.clanMembers(clanTag)).items;
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
		// this.memberPointList.forEach(mp => {
		// 	if (mp.tag === mamberTag){
		// 		mp.point += points;
		// 	}
		// })
		this.memberPointList[id].point += points;
		fs.writeFileSync('/home/manu/QQ-rebot/mcl/clashOfClans/resources/point.json', JSON.stringify(this.memberPointList));
		return true;
	}
	showPoints() {
		return this.memberPointList;
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

module.exports = {
	cocF: async function(){
		let coc = new Coc();
		await coc.init();
		await coc.initPoint('#2Y9GLJC0Y');
		return coc;
	}
};
