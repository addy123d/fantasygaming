const nodemailer = require("nodemailer");

// Initialis !
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "onlinemarketplaceterna@gmail.com",
        pass: "Online8898"
    }
});


const winnerMail = (email,body,cb) => {
    const mailOptions = {
        to: email, // This is to be allowed by GMAIL
        from: 'Fantasy Gaming Result',
        subject: "You WON",
        text: body
    };


    // Send Mail
    transporter.sendMail(mailOptions, (err, data) => {
        console.log("Sending....");
        if (err) {
            console.log("Error from nodemailer or gmail might be !", err)
            cb(err, null);
        } else {
            console.log("Success ! Mail has been sent successfully from nodemailer !");
            cb(null, data);
        }
    });
}

module.exports = winnerMail;
