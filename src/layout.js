const fs = require('fs');

class Layout {
    constructor() {
        this.layouts = JSON.parse(fs.readFileSync('resources/layout.json', 'utf-8').toString())
    }
    getRandom(level) {
        let layout = this.layouts.filter(o => o.level === level);
        let index = Math.floor((Math.random() * layout.length));
        return layout[index];
    }
    addLayout({ summary = 'no', level, imgPath, type, link, auth }) {
        let id = new Date().getTime();
        imgPath = 'clashOfClans/'+imgPath;
        this.layouts.push({ id, summary, level, imgPath, type, link, auth });
        fs.writeFileSync('resources/layout.json', JSON.stringify(this.layouts));
    }
    getLayout(level, limit) {
        let layout = this.layouts.filter(o => o.level === level);
        if (Array.isArray(layout) && layout.length === 0){
            return [];
        } else {
            return layout.slice(0,limit);
        }
    }
}

module.exports = { Layout };
