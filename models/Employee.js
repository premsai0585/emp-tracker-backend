const mongoose = require("mongoose")

const empSchema = mongoose.Schema({
    empID: String,
    empName: String,
    DOB: String,
    gender: String,
    emailID: String,
    mobile: String,
    bloodGP: String,
    joinDate: Date,
    role: String
})

const Emp = mongoose.model("Employee", empSchema);
module.exports = Emp;