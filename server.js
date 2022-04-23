const express = require("express");
const mongo = require("mongoose");
const session = require("express-session");
const Insta = require('instamojo-nodejs');
const socket = require("socket.io");
const dbkey = require("./setup/config").url;
const websocket = require("ws");
const ejs = require("ejs");
const matches = require("./utils/matches.json");
const players = require("./utils/players.json");
const getTime = require("./utils/getTime");
const port = process.env.PORT || 3000;
const host = "127.0.0.1";

const API_KEY = 'test_daff4b449d066d06e79d3e74db9';
const AUTH_KEY = 'test_5d451fdb1c7d1e640cae8902ea4';

Insta.setKeys(API_KEY, AUTH_KEY);
Insta.isSandboxMode(true);

let app = express();

app.set('trust proxy', 1) // trust first proxy
app.use(session({
    name: "user",
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, path: "/" }
}))

// Import Tables
const User = require("./tables/User");
const Club = require("./tables/Clubs");
const { query, request } = require("express");
const { response } = require("express");

// Database Connection !
mongo.connect(dbkey)
    .then(() => {
        console.log("Database Connected Successfully !");
    })
    .catch(err => console.log("Error: ", err));

app.use(express.static(__dirname + "/client"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ "extended": false }));

function unauthenticated(request, response, next) {
    console.log(request.session);

    if (request.session.email != undefined) {
        next();
    } else {
        response.redirect("/login");
    }
}

function authenticated(request, response, next) {
    if (request.session.email) {
        response.redirect("/");
    } else {
        next();
    }
}

const rooms = [];

app.get("/", (request, response) => {
    let sessionStatus = false;

    if (request.session.email != undefined) sessionStatus = true;

    response.render("index", { sessionStatus });
})

// Auth Routes
app.post("/postregister", (request, response) => {
    console.log(request.body);

    const { name, email, contact, password } = request.body;

    User.findOne({ email: email })
        .then((user) => {
            if (user) {
                response.status(503).json({
                    responseCode: 503
                })
            } else {
                let userObject = {
                    name: name,
                    coins: 0,
                    email: email,
                    contact: contact,
                    password: password
                }

                new User(userObject).save()
                    .then((user) => {
                        console.log("User registered successfully !");

                        // Store Sessions !
                        request.session.name = user.name;
                        request.session.email = user.email;
                        request.session.contact = user.contact;

                        response.status(200).json({
                            responseCode: 200
                        })
                    })
                    .catch(err => console.log("Error: ", err));
            }
        })
        .catch((err) => {
            console.log("Error: ", err);
            response.status(503).json({
                responseCode: 503
            })
        });

})

app.post("/postlogin", (request, response) => {
    console.log(request.body);

    const { email, password } = request.body;

    User.findOne({ email: email })
        .then((user) => {
            if (user) {
                if (user.password === password) {

                    // Store Sessions !
                    request.session.name = user.name;
                    request.session.email = user.email;
                    request.session.contact = user.contact;

                    response.status(200).json({
                        responseCode: 200
                    })

                } else {
                    response.status(503).json({
                        responseCode: 503
                    })
                }
            } else {
                response.status(503).json({
                    responseCode: 503
                })
            }
        })
        .catch((err) => {
            console.log("Error: ", err);
            response.status(503).json({
                responseCode: 503
            })
        });
})

app.get("/register", authenticated, (request, response) => {
    response.render("register");
})

app.get("/login", authenticated, (request, response) => {
    response.render("login");
})

app.get("/createRoom", unauthenticated, (request, response) => {
    response.render("room.ejs");
})

app.get("/chat", unauthenticated, (request, response) => {
    let status = "";
    let lendRequests_length;
    let lendbutton = false;
    let matches, participants = [];
    const { name, email } = request.session;
    console.log(request.query.id);
    let { id } = request.query;

    Club.findOne({ club_id: request.query.id })
        .then((club) => {
            let coins;
            if (club) {
                console.log("Club Structure: ");
                console.log(club);


                matches = club.club_matches;
                participants = club.participants;
                lendRequests_length = club.lendRequests.length;
                console.log("PARTICIPANTS: ");
                console.log(participants);

                // Check for coins !
                let participantIndex = participants.findIndex(participant => participant.email === email);
                console.log("Index: ");
                console.log(participantIndex);

                // Check whether this person is admin or not !
                if (club.admin_email === email) {
                    console.log("ADMIN");
                    status = "admin";
                    coins = club.club_adminCoin;
                } else {
                    console.log("PARTICIPANT");
                    status = "participant";
                    if (participantIndex < 0) {
                        coins = 0;
                    } else {
                        coins = participants[participantIndex].coins;
                    }
                    lendbutton = true;
                }

                console.log("Coins: ");
                console.log(coins);

                response.render("chatroom", { name, email, coins, status, matches, participants, id, lendRequests_length });
            } else {
                matches = [];
                participants = [];
                status = "admin";
                coins = 0;
                lendRequests_length = 0;
                response.render("chatroom", { name, email, coins, status, matches, participants, id, lendRequests_length });
            }
        })
        .catch(err => console.log("Error: ", err));
})

// Payment gateway integration
app.get("/pay", unauthenticated, (req, res) => {

    let { number_coins, title, id } = req.query;

    let finalCost = Number(number_coins * 50);

    let REDIRECT_URL = `http://localhost:3000/success?title=${title}&id=${id}&coins=${number_coins}`;

    let data = new Insta.PaymentData();
    data.purpose = "Purchase Coins";
    data.phone = 1234567890;// REQUIRED
    data.amount = finalCost;// REQUIRED
    data.currency = 'INR';
    data.buyer_name = req.session.name;
    data.email = req.session.email;
    data.setRedirectUrl(REDIRECT_URL);

    Insta.createPayment(data, function (error, response) {
        if (error) {
            // some error
            console.log("Error: ");
            console.log(error);
        } else {
            // Payment redirection link at response.payment_request.longurl
            console.log("Response: ");
            console.log(response);
            const parsed_response = JSON.parse(response);


            res.redirect(parsed_response.payment_request.longurl);
        }
    });
})

app.get("/success", unauthenticated, (req, res) => {
    console.log("Payment ID : ", req.query.payment_id);
    console.log("Payment Request ID : ", req.query.payment_request_id);

    // Update database !
    Insta.getPaymentDetails(req.query.payment_request_id, req.query.payment_id, function (error, response) {
        if (error) {
            // Some error
            console.log("Something went wrong !");

        } else {
            console.log("Final Response: ");
            console.log(response);
            Club.updateOne({
                club_id: req.query.id
            },
                {
                    $set: { club_adminCoin: req.query.coins }
                },
                {
                    $new: true
                })
                .then(() => {
                    //   Coin Updated successfully !
                    // http://localhost:3000/chat?title=${title}&id=${id}
                    console.log("Coin Updated Successfully !");
                    res.redirect(`http://localhost:3000/chat?title=${req.query.title}&id=${req.query.id}`);
                })
                .catch(err => console.log("Error: ", err));
        }
    });

    // res.redirect(`http://localhost:3000/chat?title=${req.query.title}&id=${req.query.id}`);

})

// Create Match !
app.get("/create", unauthenticated, (request, response) => {
    const { team1, team2, id, name } = request.query;
    // check for team1, team2 and same date !
    let { month, date } = getTime();

    Club.findOne({ club_id: id })
        .then((club) => {
            let matches = club.club_matches;
            console.log("Matches: ");
            console.log(matches);

            let matchIndex = matches.findIndex((match) => match.homeTeam === team1 && match.awayTeam === team2);
            console.log("Match Index: ");
            console.log(matchIndex);

            if (matchIndex >= 0) {
                console.log("Date: ")
                console.log(date);
                console.log("Match Date: ");
                console.log(matches[matchIndex].matchDate);
                // There is a chance of repetitive match creation
                if (date === Number(matches[matchIndex].matchDate)) {
                    response.json({
                        message: "Match created already"
                    })
                } else {
                    response.render("createMatch", { home: team1, away: team2, id: id, date: date, name: name });
                }
            } else {
                // Create Match !
                response.render("createMatch", { home: team1, away: team2, id: id, date: date, name: name });
            }
        })
        .catch(err => console.log("Error: ", err));


})

app.post("/createMatch", unauthenticated, (request, response) => {

    console.log("CREATE MATCH");

    const { homeTeam, awayTeam, entryPoints, rewardPoints, date, id, name } = request.body;
    console.log(id);

    // Check whether admin has coins equal to greater than entry coins !
    Club.findOne({ club_id: id })
        .then((club) => {
            console.log(club);
            if (club.club_adminCoin >= Number(entryPoints)) {
                // Proceed Further
                // Create Match for participants, updates club table
                Club.updateOne({
                    club_id: id
                }, {
                    $push: {
                        club_matches: {
                            matchId: Date.now(),
                            homeTeam: homeTeam,
                            awayTeam: awayTeam,
                            matchDate: date,
                            entryPoint: entryPoints,
                            rewardPoint: rewardPoints
                        }
                    }
                }, {
                    $new: true
                })
                    .then(() => {
                        // Now deduct entry coins from admin coins !
                        Club.updateOne(
                            { club_id: id },
                            { $set: { club_adminCoin: Number(club.club_adminCoin) - Number(entryPoints) } },
                            { $new: true })
                            .then(() => {
                                console.log("Match Created Successfully !");
                                response.json({
                                    id: id,
                                    name: name,
                                    message: "Match Created Successfully !",
                                    responseCode: 200
                                })
                            })
                            .catch(err => console.log("Error :", err));

                    })
                    .catch(err => console.log("Error: ", err));
            } else {
                response.json({
                    message: "Less Coins"
                })
            }
        })
        .catch(err => console.log("Error: ", err));

});

app.get("/play", unauthenticated, (request, response) => {
    // Check whether you have sufficient coins or not !
    // Use email as primary key
    let { id, matchID } = request.query;
    let eligibility = false;

    Club.findOne({ club_id: id })
        .then((club) => {
            let participants = club.participants;
            let matches = club.club_matches;

            let participantIndex = participants.findIndex((participant) => participant.email === request.session.email);
            let matchIndex = matches.findIndex((match) => match.matchId === matchID);

            if (participantIndex < 0) {
                // This can't happen, just for debugging purpose
            } else {
                console.log("Participant Coins: ");
                console.log(participants[participantIndex].coins);
                console.log("Match Entry Points: ");
                console.log(matches[matchIndex].entryPoint);

                let homeTeam = matches[matchIndex].homeTeam;
                let awayTeam = matches[matchIndex].awayTeam;

                // Check whether player have sufficient coins to play
                // Extract entry coins from matches list and user coins from participants list
                if (Number(participants[participantIndex].coins) >= Number(matches[matchIndex].entryPoint) + 49.5) {
                    eligibility = true;
                    response.render("playMatch", { eligibility, id, homeTeam, awayTeam });
                } else {
                    response.render("playMatch", { eligibility, id, homeTeam, awayTeam });
                }
            }

        })
        .catch(err => console.log("Error: ", err));
});

app.post("/lendpoints", unauthenticated, (request, response) => {
    let { id, coins } = request.body;

    Club.findOne({ club_id: id })
        .then((club) => {
            if (club.club_adminCoin >= coins) {
                Club.updateOne({
                    email: request.session.email
                }, {
                    $push: {
                        lendRequests: {
                            name: request.session.name,
                            email: request.session.email,
                            amount: Number(coins)
                        }
                    }
                }, {
                    $new: true
                })
                    .then(() => {
                        console.log("Lend request sent !");
                        response.json({
                            message: "Request sent !"
                        })
                    })
                    .catch(err => console.log("Error: ", err));
            } else {
                response.json({
                    message: "Admin don't have coins"
                })
            }

        })
        .catch(err => console.log("Error: ", err));
})

app.get("/requests", unauthenticated, (request, response) => {
    let { id } = request.query;

    Club.findOne({ club_id: id })
        .then((club) => {
            let lendrequests = club.lendRequests;
            response.render("lendrequests", { lendrequests, id });
        })
        .catch(err => console.log("Error: ", err));


});

app.get("/lend", unauthenticated, (request, response) => {
    let { id, email, amount } = request.query;

    Club.findOne({ club_id: id })
        .then((club) => {
            let coins = club.club_adminCoin;
            let club_title = club.club_name;

              // admin coin update
            Club.updateOne(
                {
                    club_id: id
                }, {
                $set: {
                    club_adminCoin: Number(coins) - Number(amount)
                }
                }, {
                    $new: true
                })
                    .then(() => {
                    // update participants coin
                   Club.updateOne({
                        club_id: id,
                        "participants.email": email
                    },{
                        $set : {
                            "participants.$.coins": Number(amount)
                        }
                    })
                     .then(()=>{
                        //  Delete lend requests
                        Club.updateOne({
                            club_id: id
                        }, {
                            $pull: { lendRequests: { email: email } }
                        }, {
                            $new: true
                        })
                            .then(()=>{ 
                                // redirect to chat page !
                                response.redirect(`http://localhost:3000/chat?title=${club_title}&id=${id}`);
                            })
                            .catch(err=>console.log("Error: ",err));

                     })
                     .catch(err=>console.log("Error: ",err))

                    })
                    .catch(err => console.log("Error: ", err));

        })
        .catch(err => console.log("Error: ", err));


})

app.get("/createteam",unauthenticated,(request,response)=>{
    let {home,away,id} = request.query;
    let name = request.session.name;
    let email = request.session.email;

    response.render("createTeam",{players,home,away,name,email,id});
})

app.post("/play",unauthenticated,(request,response)=>{
    console.log(request.body);
    let {id,homeTeam,awayTeam,participantName,participantEmail,players} = request.body;

    Club.findOne({club_id : id})
    .then((club)=>{

        let participants = club.participants;

        const participantIndex = participants.findIndex((p)=>p.email === request.session.email);



        Club.updateOne({
            club_id : id 
         },{
             $push : {contests : {
                 homeTeam,
                 awayTeam, 
                 participantName,
                 participantEmail,
                 players
             }}
         })
             .then(()=>{
                Club.updateOne({
                    club_id : id,
                    'participants.email' : request.session.email 
                },{
                    $set : {'participants.$.coins' : Number(participants[participantIndex].coins - 54)}
                })
                    .then(()=>{
                        response.json({
                            message : "Players Added Successfully "
                        })
                    })
                    .catch(err=>console.log("Error: ",err));
             })
             .catch(err=>console.log("Error: ",err));
    })
    .catch(err=>console.log("Error: ",err));
   

})

app.get("/logout", unauthenticated, (request, response) => {
    request.session.destroy(function (err) {
        // cannot access session here
        response.redirect("/login")

    });
})

const httpServer = app.listen(port, host, () => {
    console.log("Server is running...");
})

const io = socket(httpServer);


// Functions
function pushRoom(id, group_name, name, socket_id, status) {
    //Push room to the rooms array !
    // Create object
    const room = {
        id, group_name, names: [{ name: name, client_id: socket_id, status: status }]
    };

    // // Push this room into the rooms arrays
    rooms.push(room);

    console.log("Rooms :", rooms);

    return room;
};

function pushNames(index, name, socket_id, status) {
    // Push name of the client into names array !
    rooms[index].names.push({ name: name, client_id: socket_id, status: status });
    console.log("Clients :", rooms[index].names);

    console.log("Rooms :", rooms);

    return rooms[index].names;
};

function userRetrieve(group_id, client_id) {

    const getIndex = rooms.findIndex((room) => room.id === group_id);

    try {
        const userIndex = rooms[getIndex].names.findIndex((name) => name.client_id === client_id);
        return rooms[getIndex].names[userIndex];
    } catch (error) {
        console.log("Error :", error);
        return null;
    };

};


function deleteUser(group_id, client_id) {
    const room = rooms.find((room) => room.id === group_id);

    if (room === undefined) {
        return -1;
    }

    const userIndex = room.names.findIndex((user) => user.client_id === client_id);

    if (userIndex != -1) {
        room.names.splice(userIndex, 1);
    }
};

io.on("connection", function (client) {

    setInterval(() => {
        let matchesList = [];

        let { month, date, hourtime, minutes } = getTime();

        // Check whether there are matches on particular date and month !
        // List out particular matches on particular date !

        matches.forEach((match) => {
            if (match.month === month && match.date === date && (match.hours >= hourtime || match.minutes >= minutes)) {
                matchesList.push(match);
            }
        })

        client.emit("matches", {
            list: matchesList
        })


    }, 1000);

    // client.on("coinstatus", (data) => {
    //     io.to(data.id).emit("coins", {
    //         coins: data.coins
    //     })
    // });

    // Send connection message to server
    client.on("join", function (data) {
        console.log("Hit Join !");
        // console.log(data);

        // Collect all information from data

        const { id, group_name, name, email } = data;

        // Search for room index in rooms array
        const getIndex = rooms.findIndex((room) => room.id === id);
        // console.log(getIndex);

        //First check whether club exists or not !
        Club.findOne({ club_id: id })
            .then((club) => {
                if (club) {

                    let participants = club.participants;
                    let participantIndex = participants.findIndex(participant => participant.email === email);

                    //Club exists !
                    // Check whether it is our admin or new participant ! 
                    // Also if participant already exists in the array so, just don't add again and again
                    if (participantIndex < 0) {//That this are our new participants
                        // // Push name of the client into names array !
                        let status = "participant";

                        Club.updateOne({
                            club_id: id
                        }, {
                            $push: { participants: { name: name, email: email, status: status, id: client.id, coins: 0 } }
                        }, {
                            $new: true
                        })
                            .then((update) => {
                                console.log("Update");
                                console.log(update);
                                console.log("Participant Added");

                                io.to(id).emit("room", {
                                    name: name
                                })

                                client.join(id);

                                client.to(id).emit("enter", {
                                    message: `${name} entered the chat !`,
                                    time: new Date().toLocaleTimeString()
                                });



                            })
                            .catch(err => console.log("Error: ", err));


                    } else {
                        if (club.admin_email === email) {
                            let status = "admin";
                            // const room = pushNames(getIndex,name,client.id,status);

                            if (getIndex < 0) {
                                let room = pushRoom(id, group_name, name, client.id, status);
                            } else {
                                const statusIndex = rooms[getIndex].names.findIndex(user => user.status === "Admin");

                                if (statusIndex < 0) {
                                    let names = pushNames(getIndex, name, client.id, status);

                                }
                            }


                            client.join(id);

                            // emit admin status !
                            client.emit("adminstatus", { status: true });
                        }



                    }


                    console.log("Club Participants: ");
                    console.log(club);



                } else {  //New club in formation!
                    let status = "admin";
                    const AdminObj = {
                        club_id: id,
                        club_name: group_name,
                        club_admin: name,
                        admin_email: email,
                        club_creationDate: new Date().toLocaleTimeString(),
                        club_adminCoin: 0,
                        lendRequests : [],
                        participants: [{ name: name, email: email, id: client.id, status: status, coins: 0 }],
                        club_matches: [],
                        contests : []
                    }

                    new Club(AdminObj).save()
                        .then(() => {
                            console.log("Club saved in database...");
                        })
                        .catch(err => console.log("Error: ", err));


                    const room = pushRoom(id, group_name, name, client.id, status);

                    client.join(room.id);
                    // emit admin status !
                    client.emit("adminstatus", { status: true });

                    console.log("ROOMS: ");
                    console.log(rooms);
                }
            })
            .catch(err => console.log("Error: ", err));
    });


    // Collect messages from client
    client.on("message", function (data) {

        client.to(data.id).emit("server_message", {
            message: data.message,
            name: data.name,
            time: new Date().toLocaleTimeString()
        });
    });


    //Send typing message
    client.on("typing", function (data) {
        client.to(data.id).emit("server_type_message", {
            type: data.type,
            name: data.name
        });
    });

    client.on("close", function (data) {
        const { id } = data;

        const user = userRetrieve(id, client.id);

        console.log("User :", user);

        if (user === null || user == undefined) {
            client.to(id).emit("leave", {
                message: `${user} has left the chat !`
            });
        } else {
            client.to(id).emit("leave", {
                message: `${user.name} has left the chat !`,
                time: new Date().toLocaleTimeString()
            });
        }

        // Delete user
        // Don't completely delete user from database when he/she leaves the group
        // Delete when he/she wants to completely leave the group and make seperate option for that

        // Club.updateOne({
        //     club_id: id
        // }, {
        //     $pull: { participants: { id: client.id,status : "participant" } }
        // }, {
        //     $new: true
        // })
        //     .then(() => {
        //         console.log("Someone left !");
        //     })
        //     .catch(err => console.log("Error: ", err));

    });


    console.log("Client added !");
});



