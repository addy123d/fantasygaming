const express = require("express");
const mongo = require("mongoose");
const session = require("express-session");
const dbkey = require("./setup/config").url;
const websocket = require("ws");
const ejs = require("ejs");
const matches = require("./utils/matches.json");
const port = process.env.PORT || 5000;
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
                        request.session.email = user.email;
                        request.session.contact = user.contact;

                        response.status(200).json({
                            responseCode : 200
                        })
                    })
                    .catch(err=>console.log("Error: ",err));
            }
        })
        .catch(err=>console.log("Error: ",err));

})

app.post("/postlogin",(request,response)=>{
    console.log(request.body);

    const {email,password} = request.body;

    User.findOne({email : email})
        .then((user)=>{
            if(user){
                if(user.password === password){

                    // Store Sessions !
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
        .catch(err=>console.log("Error: ",err));
})

app.get("/register",authenticated,(request,response)=>{
    response.render("register");
})

app.get("/login",authenticated,(request,response)=>{
    response.render("login");
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

const wss = new websocket.Server({server : httpServer});


wss.on("connection", (ws) => {

    setInterval(() => {
        let matchesList = [];

        let { hourtime, minutes, month, date } = getTime();

        // Check whether there are matches on particular date and month !
        // List out particular matches on particular date !

        matches.forEach((match)=>{
            if(match.month === month && match.date === date){
                matchesList.push(match);
            }
        })

        ws.send(JSON.stringify({
            list : matchesList
        }))


    }, 5000);

    console.log(`Client with id ${ws} connected !`);
})

wss.on("close", (ws) => {
    console.log(`Client with id ${ws} disconnected !`);
})



