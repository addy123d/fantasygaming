// table will contain details about club name, club admin,club creation date,club admin coins!
const mongo = require("mongoose");
const schema = mongo.Schema;

const clubSchema = new schema({
    club_id : {
        type : String,
        required : true
    },
    club_name : {
        type : String,
        required: true
    },
    club_admin : {
        type : String,
        required : true
    },
    admin_email : {
        type : String,
        required : true
    },
    club_creationDate : {
        type : String,
        required : true
    },
    club_adminCoin : {
        type : Number,
        required : true
    },
    participants : [{
        name : {
            type : String
        },
        status : {
            type : String
        },
        id : {
            type  :String
        }
    }],
    club_matches : [{
        homeTeam : {
            type: String
        },
        awayTeam : {
            type: String
        },
        matchDate : {
            type: String
        },
        entryPoint : {
            type : String
        },
        rewardPoint : {
            type : String
        }
    }]
})

module.exports = Club = mongo.model("clubs",clubSchema);