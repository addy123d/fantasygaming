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
    lendRequests : [{
        name : {
            type : String
        },
        email : {
            type : String
        },
        amount : {
            type : Number
        }
    }],
    participants : [{
        name : {
            type : String
        },
        status : {
            type : String
        },
        email : {
            type : String
        },
        coins : {
            type : Number
        },
        id : {
            type  :String
        }
    }],
    club_matches : [{
        matchId : {
            type : String
        },
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
    }],
    contests : [{
        homeTeam : {
            type: String
        },
        awayTeam : {
            type: String
        },
        participantName : {
            type: String
        },
        participantEmail : {
            type: String
        },
        players : {
            type : Array
        }
    }]
})

module.exports = Club = mongo.model("clubs",clubSchema);