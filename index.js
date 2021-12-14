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
            connection.query("INSERT INTO Account (unique_id, first_name, last_name, email, age, admin_status, encrypted_password, salt, created_at, updated_at)" 
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
            if (encrypted_password == hashed_password) res.end(JSON.stringify(result[0])); 
            else res.end(JSON.stringify('Wrong Password!'));
        }
        else res.json('User does not exist!');
    });
})

// Endpoint to get all books
app.get('/getAllBooks', (req,res,next) => {
    
    // dont need post data from request body
    
    connection.query('SELECT * FROM Book',
    function(err, result, fields) {
        // Check connection 
        connection.on('error', function(err) {
            console.log('[MySQL Error]', err);
        });

        if (result && result.length) {
            res.end(JSON.stringify(result));
        }
        else {
            res.end(JSON.stringify('No books available')); // keep same energy for searching by query
        }
    });
})

// Endpoint to get books by filter (of choice from user)
app.post('/getBooksByFilter', (req,res,next) => {

    var post_data = req.body; //get post body
    var search_field = post_data.search; // get field "search" from post data
    var filter_field = post_data.filter; // get field "filter" from post data

    var query = "SELECT * FROM Book WHERE " + filter_field + " LIKE '%" + search_field + "%'";

    connection.query(query, function(err, result, fields) {
        connection.on('error',function(err) {
            console.log('[MySQL Error]', err);
        });

        res.end(JSON.stringify(result));

        // if (result && result.length) {
        //     res.end(JSON.stringify(result));
        // }
        // else {
        //     res.end(JSON.stringify('No books available')); // keep same energy for searching by query
        // }
    });
})

// Endpoint to check out a book 
// params: id and email/username
// must subtract 1 from Book field Stock where Id = id
// must add row to BookHistory table and fill Id with id and User with email, fill in other fields
app.post('/checkoutBook', (req, res, next) => {
    var post_data = req.body; // get POST parameters
    var id = post_data.id;
    var email = post_data.email;

    var checkout_action = "Check Out";

    connection.query('SELECT * FROM Book where id = ?', [id], function(err,result,fields) {
            // Check connection
            connection.on('error', function(err) {
                console.log('[MySQL ERROR]', err);
            });

        if (result[0].stock <= 0) res.json('Out of Stock!');
        else
        {
            connection.query("UPDATE Book SET stock = stock - 1 WHERE id = ?", 
            [id], 
            function(err,result,fields) {
                connection.on('error', function(err) {
                    console.log('[MySQL ERROR]', err);
                    res.json('Register error: ', err);
                });
                //res.json('Checkout Successful!');
            })

            connection.query("INSERT INTO BookHistory (book_id, account_id, book_action, action_time) "
                            + "VALUES (?, "
                            + "(SELECT id FROM Account WHERE email = ?), "
                            + "?, NOW())",
            [id, email, checkout_action],
            function(err,result,fields) {
                connection.on('error', function(err) {
                    console.log('[MySQL ERROR]', err);
                    res.json('Register error: ', err);
                });
                res.json('Checkout Successful!');
            })
            
        }
    });
})

// Endpoint to check out a book 
// params: id and email/username
// must subtract 1 from Book field Stock where Id = id
// must add row to BookHistory table and fill Id with id and User with email, fill in other fields
app.post('/checkInBook', (req, res, next) => {
    var post_data = req.body; // get POST parameters
    var book_id = post_data.book_id;
    var history_id = post_data.history_id;

    var checkin_action = "Check In";

    connection.query("UPDATE Book SET stock = stock + 1 WHERE id = ?", 
    [book_id], 
    function(err,result,fields) {
        // Check connection
        connection.on('error', function(err) {
            console.log('[MySQL ERROR]', err);
            res.json("Can't Check In!");
        });
        
    });

    connection.query("UPDATE BookHistory SET book_action = \"Check In\", action_time = NOW() WHERE id = ?",
    [history_id],
    function(err,result,fields) {
        // Check connection
        connection.on('error', function(err) {
            console.log('[MySQL ERROR]', err);
            res.json("Can't Check In!");
        });
        res.json("Check In Successful!")
    })
})

// endpoint to get all books checked out by user
app.post('/getCheckedOutBooksByUser', (req, res, next) => {
    var post_data = req.body;
    var email = post_data.email;
    var book_action = "Check Out"

    connection.query("SELECT Book.* FROM Book, Account, BookHistory "
                    + "where Book.id = BookHistory.book_id "
                    + "and Account.id = BookHistory.account_id "
                    + "and Account.id = (select id from Account where email = ?) "
                    + "and BookHistory.book_action = ?",
                    [email, book_action],
                    function(err,result,fields) {
                        connection.on('error', function(err) {
                            console.log('[MySQL ERROR]', err);
                        });
                        res.end(JSON.stringify(result));
                    })

})

// endpoint to drop off book
app.post('/dropOffBook', (req,res,next) => {
    var post_data = req.body;
    var id = post_data.book_id;
    var email = post_data.email;
    var book_action = "Dropped Off"

    connection.query("INSERT INTO BookHistory (book_id, account_id, book_action, action_time) "
                            + "VALUES (?, "
                            + "(SELECT id FROM Account WHERE email = ?), "
                            + "?, NOW())",
            [id, email, book_action],
            function(err,result,fields) {
                connection.on('error', function(err) {
                    console.log('[MySQL ERROR]', err);
                    res.json('Register error: ', err);
                });
                res.json('Dropoff Successful!');
            })
})

// Endpoint to get dropped off books
app.get('/getDroppedOffBooks', (req,res,next) => {
    
    // dont need post data from request body
    
    var dropped_off_action = "Dropped Off";

    connection.query('SELECT DISTINCT Book.*, Account.email, BookHistory.id AS history_id FROM Book, Account, BookHistory ' 
                    + 'where BookHistory.account_id = Account.id '
                    + 'and Book.id = BookHistory.book_id '
                    + 'and BookHistory.book_action = "Dropped Off"',
    function(err, result, fields) {
        // Check connection 
        connection.on('error', function(err) {
            console.log('[MySQL Error]', err);
        });

        if (result && result.length) {
            res.end(JSON.stringify(result));
        }
        else {
            res.end(JSON.stringify('No books waiting to be checked in')); 
        }
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

module.exports = app