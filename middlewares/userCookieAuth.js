const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const dotenv = require('dotenv');

dotenv.config();

const userCookieAuth = async (req, res, next) => {
    if (req.cookies.token) {
        try {
            const {empID} = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN)
            const admin = await Admin.findOne({ empID: empID });
            if (admin) {
                req.admin = admin;
                next();
            } else {
                res.sendStatus(401);
            }
        } catch (error) {
            res.sendStatus(401);
        }
    } else {
        res.sendStatus(401);
    }
}

module.exports = userCookieAuth;