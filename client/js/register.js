console.log("Registration JS");

const name = document.getElementById("name");
const email = document.getElementById("email");
const contact = document.getElementById("contact");
const password = document.getElementById("password");
const registerButton = document.getElementById("registerButton");
const notification = document.querySelector(".notification");

registerButton.addEventListener("click",()=>{
    const options = {
        method : "POST",
        body : JSON.stringify({
            name : name.value,
            email : email.value,
            contact : contact.value,
            password : password.value
        }),
        headers : new Headers({
            "Content-Type" : "application/json"
        })
    }

    fetch("/postregister",options)
        .then(res=>res.json())
        .then((result)=>{
            console.log("Result: ",result);

            if(result.responseCode === 200){
                notification.innerHTML = "<h2>Success ✔</h2>";
                notification.classList.add("active");

                setTimeout(()=>{
                    location.href = "/";
                },1000);
                
            }else{
                notification.innerHTML = "<h2>Failed ❌</h2>";
                notification.classList.add("active");
            }

            setTimeout(()=>{
                notification.classList.remove("active");
            },2000);
        })
        .catch(err=>console.log("Error: ",err));

    // Reset all input fields !
    name.value = "";
    email.value = "";
    contact.value = "";
    password.value = "";
})
