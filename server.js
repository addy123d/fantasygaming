const express = require("express");
const websocket = require("ws");
const ejs = require("ejs");
const {createUser,validate} = require("./utils/auth.js");
const matches = require("./utils/matches.json");
const port = process.env.PORT || 5000;
const host = "127.0.0.1";

let app = express();

app.use("/",express.static(__dirname+"/client"));
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({"extended":false}));

// Auth Routes
app.post("/postregister",(request,response)=>{
    console.log(request.body);
    let responseObject = createUser(request.body);

    if(responseObject.responseCode === 200){
        console.log("Users stored: ");
        console.log(responseObject.users);
    
        response.json({
            message : "Registration Success",
            responseCode : 200
        })
    }else{
        response.json({
            message: "User already exists with this email",
            responseCode : 503
        })
    }


})

app.post("/postlogin",(request,response)=>{
    console.log(request.body);

    let responseObject = validate(request.body);

    if(responseObject === -1){
        response.json({
            message : "User need to register first ☹",
            responseCode : 503
        })
    }else{
        if(responseObject.message === "access denied"){
            response.json({
                message : "Password not matched !",
                responseCode : 503
            })
        }else{
            response.json({
                message : `Welcome Back, ${responseObject.user.name}`,
                responseCode : 200
            })
        }
    }
})

app.get("/register",(request,response)=>{
    response.render("register");
})

app.get("/login",(request,response)=>{
    response.render("login");
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



