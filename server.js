const express = require('express');
const cookieParser = require("cookie-parser");
const parser = require("body-parser");
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const Admin = require('./models/Admin');
const Emp = require('./models/Employee')
const Atnd = require('./models/Attendance')
const userCookieAuth = require('./middlewares/userCookieAuth');
const jwt = require('jsonwebtoken');
const moment = require('moment')
const checkWeekday = require('./middlewares/checkWeekday')

dotenv.config();

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_DB_URI);

const app = express();

var corsOptions = {
    origin: process.env.CLIENT_URL,
    optionsSuccessStatus: 200,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept"
}

app.use(cors(corsOptions))
app.use(express.json());
app.use(cookieParser());
app.options('*', cors(corsOptions))

async function addAtnd(emps, days = 10){
    var objs = [];
    var startTime = `${moment().subtract(days, 'days').format('YYYY-MM-DD')}T03:00:00Z`;
    emps.forEach(emp => {
        const {empID} = emp;
        for (var i = 0; i < days; i++){
            if (Math.floor(Math.random()*10) > 1 && parseInt(moment(startTime).add(i, 'days').format('d'))!=0 && parseInt(moment(startTime).add(i, 'days').format('d'))!=6){
                objs.push({empID, date: moment(startTime).add(i, 'days').format('YYYY-MM-DD'), inTime: moment(startTime).add(i, 'days').add(Math.floor(Math.random()*40), 'minutes').toDate(), endTime: moment(startTime).add(i, 'days').add(Math.floor(Math.random()*60), 'minutes').add(8, 'hours').toDate()});
            }
        }
    });
    await Atnd.insertMany(objs);
}

app.post('/login', async (req, res) => {
    const admin = await Admin.findOne({empID: req.body.empID, password: req.body.password});
    if (admin){
        const accessToken = await jwt.sign({ empID: admin.empID }, process.env.ACCESS_TOKEN)
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: true,
            hidden: true,
            sameSite: 'none'
        })
        res.sendStatus(200);
    } else {
        res.sendStatus(401);
    }
})

app.get('/verifytoken', async (req, res) => {
    if (req.cookies.token) {
        try {
            const {empID} = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN)
            const admin = await Admin.findOne({ empID: empID });
            if (admin) {
                req.admin = admin;
                res.sendStatus(200);
            } else {
                res.sendStatus(401);
            }
        } catch (error) {
            res.sendStatus(401);
        }
    } else {
        res.sendStatus(401);
    }
})

app.get('/logout', userCookieAuth, (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: true,
        hidden: true,
        sameSite: 'none'
    })
    res.sendStatus(200);
})

app.post('/Register',async(req,res)=>{
    try{
        const user = await Admin.findOne({empID:req.body.empID});
        if(user){
            res.json({msg:"Exists"});
        }else{
            const userC = await Admin.create({empID:req.body.empID,password:req.body.pass});
            res.json({msg:"Created"})
        }
    }catch(err){
        res.status(401);
    }
})

app.get('/get/emps/count', userCookieAuth, async (req, res)=>{
    const count = await Emp.countDocuments({fired:false});
    
    res.json({count});
})

app.get('/get/emps', userCookieAuth, async (req, res) => {
    const employees = await Emp.find({fired:false}).select('empID empName role fired -_id').sort('empID');
    res.json({employees: employees});
})

app.post('/add/emp', userCookieAuth, async (req, res) => {
    const count = await Emp.countDocuments({}) + 1;
    const empID = "EMP"+("0000"+count).slice(-5);
    const joinDate  = new Date();
    try {
        await Emp.create({empID, ...req.body, joinDate, fired:false});
        res.json({success:true, empID});
    } catch (error) {
        res.json({success:false});
    }
})

app.post('/fire/emp', userCookieAuth, async (req, res) => {
    const employee = await Emp.findOne({empID:req.body.empID});
    if (employee){
        if (!employee.fired){
            try {
                await Emp.updateOne({empID: req.body.empID}, {$set: {fired: true}});
                await Atnd.deleteMany({empID: req.body.empID});
                res.json({success:true});
            } catch (error) {
                res.json({success:false});
            }
        } else {
            res.json({success:true});
        }
    } else {
        res.sendStatus(401);
    }
})

app.post('/post/in/atnd', userCookieAuth, checkWeekday, async (req, res) => {
    const date = moment().format('YYYY-MM-DD');
    const empAtnd = await Atnd.findOne({empID:req.body.empID, date});
    try {
        if (!empAtnd){
            const inTime = new Date();
            await Atnd.create({empID:req.body.empID, date, inTime, endTime:null});
            res.json({success:true, inTime});
        } else {
            res.json({success:false})
        }
    } catch (error) {
        res.json({success:false})
    }
})
app.post('/post/out/atnd', userCookieAuth, checkWeekday, async (req, res) => {
    const date = moment().format('YYYY-MM-DD');
    const empAtnd = await Atnd.findOne({empID:req.body.empID, date});
    try {
        if (empAtnd && empAtnd.endTime === null){
            const endTime = new Date();
            await Atnd.updateOne({empID:req.body.empID, date}, {endTime});
            res.json({success:true, endTime});
        } else {
            res.json({success:false})
        }
    } catch (error) {
        console.log(error)
        res.json({success:false})
    }
})

app.get('/get/todays/atnd', userCookieAuth, checkWeekday, async (req, res) => {
    const todaysAttendance = await Atnd.find({date:moment().format('YYYY-MM-DD')});
    res.json({todaysAttendance});
})

app.post('/get/emp/atnd', userCookieAuth, async (req, res) => {
    const report = await Atnd.find({empID:req.body.empID, inTime:{$gte:req.body.sDate, $lte:moment(req.body.eDate).add(1, 'days').format('YYYY-MM-DD')}}).sort('date');
    res.json({report});
})

app.get('/temp-data', async (req, res) => {
    await Atnd.deleteMany({});
    const emps = await Emp.find({fired:false}).select('empID -_id');
    addAtnd(emps, req.query.days);
    res.send("Done")
})

app.listen(process.env.PORT || 5000);