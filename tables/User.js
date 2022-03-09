const mongo = require("mongoose");
const schema = mongo.Schema;

const userSchema = new schema({
    name : {
        type : String,
        required: true
    },
    coins : {
        type: Number,
        required: true
    },
    email : {
        type : String,
        required : true
    },
    contact : {
        type : String,
        required : true
    },
    password : {
        type : String,
        required : true
    }
})

module.exports = User = mongo.model("users",userSchema);