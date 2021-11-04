function diffTime(date1, date2) {
    let oDate1 = date1;
    let oDate2 = date2;
    let nTime = oDate1.getTime() - oDate2.getTime();
    let day = Math.floor(nTime/86400000);
    let hour = Math.floor(nTime%86400000/3600000);
    let minute = Math.floor(nTime%86400000%3600000/60000);
    if (day==0) {
        if (hour==0){
            if (minute==0){
                return 0 + ' min ';
            }
            return minute + ' min ';
        }
        return hour + ' h ' + minute + ' min ';
    }
    return day + ' day ' + hour + ' h ' + minute + ' min ';
}
module.exports = diffTime;