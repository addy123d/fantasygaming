// Get Time !
module.exports = () => {

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