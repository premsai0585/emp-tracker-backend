const mongoose = require("mongoose")

const atndSchema = mongoose.Schema({
    empID: String,
    date: String,
    inTime: Date,
    endTime: Date
})

const Atnd = mongoose.model("Attendance", atndSchema);
module.exports = Atnd;