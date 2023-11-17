const moment = require('moment')

const checkWeekday = (req, res, next) => {
    if (parseInt(moment().format('d')) != 0 && parseInt(moment().format('d')) != 6){
        next();
    } else {
        res.json({success:false});
    }
}

module.exports = checkWeekday;