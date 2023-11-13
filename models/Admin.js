const mongoose = require("mongoose")

const adminSchema = mongoose.Schema({
    empID: String,
    password: String
})

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;