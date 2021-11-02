/* RESTFul Test with MySql and NodeJS
*/

var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var uuid = require('uuid');
var crypto = require('crypto');

// var connection = mysql.createConnection
// (
// {
//     host: 'library-db.cihj00oxs8fu.us-east-2.rds.amazonaws.com',
//     user: 'admin',
//     password: 'masterpassword',
//     database: 'librarydb'
// }
// );

var connection = mysql.createConnection
(
{
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    database: process.env.RDS_DB_NAME
}
);

// Password utility
var genRandomString = function(length) {
    return crypto.randomBytes(Math.ceil(length/2))
        .toString('hex') // convert to hex format 
        .slice(0,length); // return required number of characters
};

var sha512 = function(password, salt) {
    var hash = crypto.createHmac('sha512', salt); // use SHA512
    hash.update(password);
    var value = hash.digest('hex');
    return {
            salt:salt,
            passwordHash:value
    };
};

function saltHashPassword(userPassword) {
    var salt = genRandomString(16);
    var passwordData = sha512(userPassword,salt);
    return passwordData;
}

function checkHashPassword(userPassword, salt)
{
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Endpoint to register account
app.post('/register', (req,res,next) => {
    var post_data = req.body; // get POST parameters
    var uid = uuid.v4(); // get UUID v4 like '110avacsasas-af0x-90333-casasjkajksk
    var plaint_password = post_data.password; // get password from post params
    var hash_data = saltHashPassword(plaint_password);
    var password = hash_data.passwordHash; // get hash value
    var salt = hash_data.salt; // get salt value

    var email = post_data.email;
    var firstName = post_data.firstName;
    var lastName = post_data.lastName;
    var age = post_data.age;
    var admin = post_data.admin;

    connection.query('SELECT * FROM Account where email = ?', [email], function(err,result,fields) {
        connection.on('error', function(err) {
            console.log('[MySQL ERROR]', err);
        });

        if (result && result.length) res.json('Account already exists!!!');
        else
        {
            connection.query("INSERT INTO Account (unique_id, first_name, last_name, email, age, admin, encrypted_password, salt, created_at, updated_at)" 
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())", 
            [uid, firstName, lastName, email, age, admin, password, salt], 
            function(err,result,fields) {
                connection.on('error', function(err) {
                    console.log('[MySQL ERROR]', err);
                    res.json('Register error: ', err);
                });
                res.json('Register Successful!');
            })
        }
    });
})

// Endpoint to login to account
app.post('/login', (req,res,next) => {

    var post_data = req.body;

    // Get email and pass from request
    var user_password = post_data.password;
    var email = post_data.email;

    // First check if email exists
    connection.query('SELECT * FROM Account WHERE Email = ?', 
    [email], 
    function(err, result, fields) {
        // Check connection
        connection.on('error', function(err) {
            console.log('[MySQL ERROR]', err);
        });
        
        if (result && result.length)
        {
            var salt = result[0].salt; // get salt of result if account exists
            var encrypted_password = result[0].encrypted_password;
            // Hash password from login request with salt in database
            var hashed_password = checkHashPassword(user_password, salt).passwordHash;
            if (encrypted_password == hashed_password) res.end(JSON.stringify(result[0])); // if password is true, return all info of user
            else res.end(JSON.stringify('Wrong Password!'));
        }
        else res.json('User does not exist!');
    });
})

// Below is a test to see if we can 'get' hashed passwords

// app.get("/", (req,res,next) => {
//     console.log('Password: 123456');
//     var encrypt = saltHashPassword("123456");
//     console.log('Encrypt: ' + encrypt.passwordHash);
//     console.log('Salt: ' + encrypt.salt);
// })

// Below is a test to send message to address
app.get("/", (req,res,) => {
    res.send("Go away!");
})

//start server
app.listen(process.env.port || process.env.RDS_PORT || 3000, () => {
    console.log('Running on port 3000')
})

