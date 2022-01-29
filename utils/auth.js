const users = [];

// We need two functions : createUser, validate

// Register User
// User Data - name, email, contact Number, Password !
function createUser(userObj){
    const {name,email,contact,password} = userObj;

    // Check whether user with this email already exists in our storage 
    const userIndex = users.findIndex(user=>user.email === email);

    if(userIndex < 0){
        // Create user object
        const user = {};

        // Create unique ID !
        let id = "id" + Math.random().toString(16).slice(2);

        user.id = id;
        user.name = name;
        user.email = email;
        user.contact = contact;
        user.password = password;

        // Store user in users array !
        users.push(user);

        return { message:"User successfully registered",users : users, responseCode : 200 };
    }else{
        return { message:"User already exists",users : null, responseCode : 503 }; // User already exists !
    }   
}

// For validation
function validate(userDetails){
    const {email, password} = userDetails;

    // First check whether user exists or not in storage !
    const userIndex = users.findIndex(user=>user.email === email);

    if(userIndex < 0){
        return -1; //User doesn't exists !
    }else{
        let resultObj;
        // Match password with stored password !
        if(password === users[userIndex].password){
          resultObj = {message : "access granted",user : users[userIndex]};
        }else{
            resultObj = {message : "access denied"};
        }

        return resultObj;
    }

}


module.exports = {createUser,validate};