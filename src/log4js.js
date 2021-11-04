var log4js = require('log4js');

log4js.configure({
	appenders: {
		std: {type: 'stdout', level: 'all', layout: {type: 'colored'} },
		file: {type: 'file', filename: 'log/log.txt', encoding: 'utf-8'}
	},
	categories: {
		default: {appenders: ['std'], level: 'debug'},
		coc: {appenders: ['std', 'file'], level: 'all'}
	}
})

module.exports = { log4js }
