const fs = require('fs');

class Point {
    constructor(client) {
        this.points = JSON.parse(fs.readFileSync('/home/manu/QQ-rebot/mcl/clashOfClans/resources/point.json', 'utf-8').toString());
        this.client = client;
    }

    init(clanTag) {
    }
}