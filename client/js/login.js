console.log("Login.JS");

const email = document.getElementById("email");
const password = document.getElementById("password");
const loginButton  = document.getElementById("loginButton");
const notification = document.querySelector(".notification");

loginButton.addEventListener("click",()=>{
    const options = {
        method : "POST",
        body : JSON.stringify({
            email : email.value,
            password : password.value
        }),
        headers : new Headers({
            "Content-Type" : "application/json"
        })
    }

    fetch("/postlogin",options)
        .then(res=>res.json())
        .then((result)=>{
            console.log("Result: ",result);
            if(result.responseCode === 200){
                notification.innerHTML = "<h2>Success ✔</h2>";
                notification.classList.add("active");
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
    email.value = "";
    password.value = "";
})