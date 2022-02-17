const express = require("express");
const mongo = require("mongoose");
const session = require("express-session");
const socket = require("socket.io");
const dbkey = require("./setup/config").url;
const websocket = require("ws");
const ejs = require("ejs");
const matches = require("./utils/matches.json");
const port = process.env.PORT || 3000;
const host = "127.0.0.1";

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
const { query } = require("express");

// Database Connection !
mongo.connect(dbkey)
    .then(()=>{
        console.log("Database Connected Successfully !");
    })
    .catch(err=>console.log("Error: ",err));

app.use(express.static(__dirname+"/client"));
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({"extended":false}));

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

app.get("/",(request,response)=>{
    let sessionStatus = false;

    if(request.session.email != undefined) sessionStatus = true;

    response.render("index",{sessionStatus});
})

// Auth Routes
app.post("/postregister",(request,response)=>{
    console.log(request.body);

    const {name,email,contact,password} = request.body;

    User.findOne({email : email})
        .then((user)=>{
            if(user){
                response.status(503).json({
                    responseCode : 503
                })
            }else{
                let userObject = {name,email,contact,password};

                new User(userObject).save()
                    .then((user)=>{
                        console.log("User registered successfully !");

                        // Store Sessions !
                        request.session.name = user.name;
                        request.session.email = user.email;
                        request.session.contact = user.contact;

                        response.status(200).json({
                            responseCode : 200
                        })
                    })
                    .catch(err=>console.log("Error: ",err));
            }
        })
        .catch((err)=>{
            console.log("Error: ",err);
            response.status(503).json({
                responseCode : 503
            })
        });

})

app.post("/postlogin",(request,response)=>{
    console.log(request.body);

    const {email,password} = request.body;

    User.findOne({email : email})
        .then((user)=>{
            if(user){
                if(user.password === password){

                    // Store Sessions !
                    request.session.name = user.name;
                    request.session.email = user.email;
                    request.session.contact = user.contact;

                    response.status(200).json({
                        responseCode : 200
                    })

                }else{
                    response.status(503).json({
                        responseCode : 503
                    })
                }
            }else{
                response.status(503).json({
                    responseCode : 503
                })
            }
        })
        .catch((err)=>{
            console.log("Error: ",err);
            response.status(503).json({
                responseCode : 503
            })
        });
})

app.get("/register",authenticated,(request,response)=>{
    response.render("register");
})

app.get("/login",authenticated,(request,response)=>{
    response.render("login");
})

app.get("/createRoom",unauthenticated,(request,response)=>{
    response.render("room.ejs");
})

app.get("/chat",unauthenticated,(request,response)=>{
    const {name,email} = request.session;

    //email, club owner name !
    response.render("chatroom",{name,email});
})

app.get("/logout", unauthenticated, (request, response) => {
    request.session.destroy(function (err) {
        // cannot access session here
        response.redirect("/login")

    });
})

const httpServer = app.listen(port,host,()=>{
    console.log("Server is running...");
})

const io = socket(httpServer);

// Get Time !
function getTime() {

    let month = new Array(12);
    month[0] = "january";
    month[1] = "february";
    month[2] = "march";
    month[3] = "april";
    month[4] = "may";
    month[5] = "june";
    month[6] = "july";
    month[7] = "august";
    month[8] = "september";
    month[9] = "october";
    month[10] = "november";
    month[11] = "december";

    const timeComponent = {};


    let currentTime = new Date();

    let currentOffset = currentTime.getTimezoneOffset();

    let ISTOffset = 330;   // IST offset UTC +5:30 

    let ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);

    // ISTTime now represents the time in IST coordinates

    let hoursIST = ISTTime.getHours()
    let minutesIST = ISTTime.getMinutes()
    let monthNumber = ISTTime.getMonth();
    let date = ISTTime.getDate();

    timeComponent.hourtime = hoursIST;
    timeComponent.minutes = minutesIST;
    timeComponent.month = month[monthNumber];
    timeComponent.date = date;

    return timeComponent;
}


// Functions
function pushRoom(id,group_name,name,socket_id,status){
    //Push room to the rooms array !
    // Create object
    const room = {
        id,group_name, names:[{ name : name, client_id: socket_id,status:status}]
    };

    // // Push this room into the rooms arrays
    rooms.push(room);

    console.log("Rooms :",rooms);

    return room;
};

function pushNames(index,name,socket_id,status){
 // Push name of the client into names array !
    rooms[index].names.push({name : name, client_id : socket_id,status:status});
    console.log("Clients :",rooms[index].names);

    console.log("Rooms :",rooms);  

    return rooms[index];
};

function userRetrieve(group_id,client_id){

    const getIndex = rooms.findIndex((room)=>room.id===group_id);

    try {
        const userIndex = rooms[getIndex].names.findIndex((name)=>name.client_id === client_id);
        return rooms[getIndex].names[userIndex];
    } catch (error) {
        console.log("Error :",error);
        return null;
    };
    
};


function deleteUser(group_id,client_id){
    const room = rooms.find((room)=>room.id === group_id);

    if(room === undefined){
        return -1;
    }

    const userIndex = room.names.findIndex((user)=>user.client_id === client_id);

    if(userIndex != -1){
        room.names.splice(userIndex,1);
    }
};

io.on("connection",function(client){

    setInterval(() => {
        let matchesList = [];

        let {month, date } = getTime();

        // Check whether there are matches on particular date and month !
        // List out particular matches on particular date !

        matches.forEach((match)=>{
            if(match.month === month && match.date === date){
                matchesList.push(match);
            }
        })

        client.emit("matches",{
            list : matchesList
        })


    }, 5000);

    // Send connection message to server
    client.on("join",function(data){
        // console.log(data);

        // Collect all information from data

        const { id, group_name, name, email} = data;

        // Search for room index in rooms array
        const getIndex = rooms.
        findIndex((room)=>room.id === id);
        // console.log(getIndex);

        //First check whether club exists or not !
        Club.findOne({club_id : id})
            .then((club)=>{
                if(club){  //Club exists !
                    // Check whether it is our admin or new participant ! 
                    if(club.admin_email != email){//That this are our new participants
                          // // Push name of the client into names array !
                            let status = "Participant";
                            const room = pushNames(getIndex,name,client.id,status);

                            client.join(room.id);
                            
                            client.to(room.id).emit("enter",{
                                message : `${name} entered the chat !`,
                                time : new Date().toLocaleTimeString()
                            });

                            io.to(room.id).emit("room",{
                                title: group_name,
                                names : room.names
                            });

                            console.log("ROOMS: ");
                            console.log(rooms[getIndex].names);
                    }else{
                        let status = "Admin";
                        // const room = pushNames(getIndex,name,client.id,status);

                        if(getIndex < 0){
                            let room = pushRoom(id,group_name,name,client.id,status);
                        }else{
                            const statusIndex = rooms[getIndex].names.findIndex(user=>user.status === "Admin");

                            if(statusIndex < 0) pushNames(getIndex,name,client.id,status);
                        }

                        client.join(id);

                        // emit admin status !
                        client.emit("adminstatus",{status : true});
                    }


                  
                }else{  //New club in formation!
                    let status = "Admin";
                            const AdminObj = {
                                club_id : id,
                                club_name : group_name,
                                club_admin : name,
                                admin_email : email,
                                club_creationDate : new Date().toLocaleTimeString(),
                                club_adminCoin : 0   
                            }

                            new Club(AdminObj).save()
                                .then(()=>{
                                    console.log("Club saved in database...");
                                })
                                .catch(err=>console.log("Error: ",err));


                                const room = pushRoom(id,group_name,name,client.id,status);

                                client.join(room.id);
                                // emit admin status !
                                client.emit("adminstatus",{status : true});

                                console.log("ROOMS: ");
                                console.log(rooms);
                }
            })
            .catch(err=>console.log("Error: ",err));

        // if(getIndex >= 0){
        //     // Check whether it is our admin or new participant ! 
        //     // // Push name of the client into names array !
        //     let status = "Participant";
        //     const room = pushNames(getIndex,name,client.id,status);

        //     client.join(room.id);
            
        //     client.to(room.id).emit("enter",{
        //         message : `${name} entered the chat !`,
        //         time : new Date().toLocaleTimeString()
        //     });

        //     io.to(room.id).emit("room",{
        //         title: group_name,
        //         names : room.names
        //     });

        // }else{
        //     // // Create object

        //     // Here I have to query database to store club rooms!
        //     const AdminObj = {
        //         club_id : id,
        //         club_name : group_name,
        //         club_admin : name,
        //         admin_email : email,
        //         club_creationDate : new Date().toLocaleTimeString(),
        //         club_adminCoin : 0   
        //     }

        //     new Club(AdminObj).save()
        //         .then(()=>{
        //             console.log("Club saved in database...");
        //         })
        //         .catch(err=>console.log("Error: ",err));


        //     // const room = pushRoom(id,group_name,name,client.id,status);

        //     client.join(id);

        //     // io.to(room.id).emit("room",{
        //     //     title: group_name,
        //     //     names : room.names,
        //     //     message : "leave"
        //     // });
        // }

    });


    // Collect messages from client
    client.on("message", function(data){

        client.to(data.id).emit("server_message",{
            message : data.message,
            name : data.name,
            time : new Date().toLocaleTimeString()
        });
    });


    //Send typing message
    client.on("typing",function(data){
        client.to(data.id).emit("server_type_message",{
            type : data.type,
            name : data.name
        });
    });

    client.on("close", function(data){
        const {id} = data;

        const user = userRetrieve(id,client.id);

        console.log("User :",user);

        if(user === null || user== undefined){
            client.to(id).emit("leave",{
                message : `${user} has left the chat !`
            });
        }else{
            client.to(id).emit("leave",{
                message : `${user.name} has left the chat !`,
                time : new Date().toLocaleTimeString()
            });
        }

        // Delete user
        deleteUser(id,client.id);

        const room = rooms.find((room)=>room.id=== id);

        if(room === undefined){
            return -1;
        }
        console.log("NAMES: ");
        console.log(room.names);

        io.to(id).emit("room",{
            names : room.names,
            title: room.group_name
        });
    });


    console.log("Client added !");
});



