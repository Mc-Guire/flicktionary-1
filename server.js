/**
* @Author: John Isaacs <john>
* @Date:   18-Mar-182018
* @Filename: server.js
* @Last modified by:   john
* @Last modified time: 27-Mar-182018
*/


const MongoClient = require('mongodb').MongoClient; //npm install mongodb@2.2.32
const url = "mongodb://localhost:27017/profiles";
const express = require('express'); //npm install express
const session = require('express-session'); //npm install express-session
const bodyParser = require('body-parser'); //npm install body-parser
const app = express();

//this tells express we are using sesssions. These are variables that only belong to one user of the site at a time.
app.use(session({ secret: 'example' }));

//CSS
app.use('/public', express.static(process.cwd() + '/public'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}))
// set the view engine to ejs
app.set('view engine', 'ejs');

var db;

//this is our connection to the mongo db, ts sets the variable db as our database
MongoClient.connect(url, function(err, database) {
  if (err) throw err;
  db = database;
  app.listen(8080);
  console.log('listening on 8080');
});


//********** GET ROUTES - Deal with displaying pages ***************************
//this is our root route
app.get('/', function(req, res) {
  if(!req.session.loggedin){
    var loggedIn = false;
    res.render('pages/flicktionary', {
      loggedIn: loggedIn,
    });
  } else{
    var loggedIn = true;
    res.render('pages/flicktionary', {
      loggedIn: loggedIn,
    })
  }
});

//this is our mediaMovies route, all it does is render the mediaMovies.ejs page.
app.get('/mediaMovies', function(req, res) {
  res.render('pages/mediaMovies');
});

//this is our mediaSeries route, all it does is render the mediaSeries.ejs page.
app.get('/mediaSeries', function(req, res) {
  res.render('pages/mediaSeries');
});

//this is our login route, all it does is render the login.ejs page.
app.get('/login', function(req, res) {
  if(!req.session.loggedin){
    res.render('pages/login');
    return;
  }
  if(req.session.loggedin){
    res.render('pages/profile?username=' + req.query.username);
    return;
  }
});

//this is our profile route, it takes in a username and uses that to search the database for a specific user
app.get('/profile', function(req, res) {
  if(!req.session.loggedin){res.redirect('/login');return;}
  //get the requested user based on their username, eg /profile?username=dioreticllama
  // var uname = req.query.username;
  //this query finds the first document in the array with that username.
  //Because the username value sits in the login section of the user data we use login.username
  db.collection('people').findOne({
    "login.username": req.session.user.login.username
  }, function(err, result) {
    if (err) throw err;
    //console.log(uname+ ":" + result);
    //finally we just send the result to the user page as "user"
    res.render('pages/profile', {
      user: result
    })
  });
});

//adduser route simply draws our adduser page
app.get('/adduser', function(req, res) {
  if(req.session.loggedin){
    res.redirect('pages/profile');
    return;}
    res.render('pages/adduser')
  });

  //remuser route simply draws our remuser page
  app.get('/remuser', function(req, res) {
    if(!req.session.loggedin){res.redirect('/login');return;}
    db.collection('people').findOne({"login.username": req.session.user.login.username}, function(err, result) {
      if (err) throw err;
      //console.log(uname+ ":" + result);
      //finally we just send the result to the user page as "user"
      res.render('pages/remuser', {
        user: result
      })
    });
  });

  //logout route cause the page to Logout.
  //it sets our session.loggedin to false and then redirects the user to the login
  app.get('/logout', function(req, res) {
    req.session.loggedin = false;
    req.session.destroy();
    res.redirect('/');
  });

  //signUp route to render signUp page
  app.get('/signUP', function(req, res){
    if(!req.session.loggedin){
      res.render('pages/signUP');
      return;
    }
  });

  //********** POST ROUTES - Deal with processing data from forms ***************************
  app.post('/favourite', function (req, res){
    if(req.session.loggedin){
          db.collection('people').findOne({"login.username":req.session.user.login.username}, function(err, result) {
          db.collection('people').update({"_id":result._id}, {$addToSet:{"favourites" : {"favouriteMedia" : {"type":req.body.typeMedia, "mediaId":req.body.favMed}}}});
          console.log("Added Media: " + req.body.favMed);
          console.log("Added Media Type: " + req.body.typeMedia);
        });
      res.redirect('/profile');
    } else{
      res.redirect('/login');
    }
  });

  app.post('/unFavourite', function (req, res){
      if(req.session.loggedin){

        db.collection('people').findOne({"login.username":req.session.user.login.username}, function(err, result) {
          db.collection('people').update({"_id":result._id}, {$pull:{"favourites" : {"favouriteMedia" : {"type":req.body.typeMedia, "mediaId":req.body.favMed}}}});
        //check for the username added in the form, if one exists then you can delete that doccument
        // db.collection('people').deleteOne(, function(err, result) {
        //   if (err) throw err;
        //   //when complete redirect to the profile
        //   res.redirect('/');
        // });

        res.redirect('/profile');
      });
      }else{
        res.redirect('/login');
      }
  });

  //the dologin route detasl with the data from the login screen.
  //the post variables, username and password ceom from the form on the login page.
  app.post('/dologin', function(req, res) {
    console.log(JSON.stringify(req.body))
    var uname = req.body.username;
    var pword = req.body.password;

    db.collection('people').findOne({"login.username":uname}, function(err, result) {
      if (err) throw err;//if there is an error, throw the error
      //if there is no result, redirect the user back to the login system as that username must not exist
      if(!result){res.redirect('/login');return}
      //if there is a result then check the password, if the password is correct set session loggedin to true and send the user to the index
      if(result.login.password == pword){
        req.session.loggedin = true;
        req.session.user = result;
        var uname = req.query.username;
        console.log("user logged in");
        res.redirect("/");
      }

      //otherwise send them back to login
      else{res.redirect('/login')}
    });
  });


  //the delete route deals with user deletion based on entering a username
  app.post('/delete', function(req, res) {
    //check we are logged in.
    if(!req.session.loggedin){res.redirect('/login');return;}

    //check for the username added in the form, if one exists then you can delete that doccument
    db.collection('people').deleteOne({"login.username":req.session.user.login.username}, function(err, result) {
      if (err) throw err;
      req.session.loggedin = false;
      //when complete redirect to the index
      res.redirect('/');
    });
  });

  app.post('/adduser', function(req, res) {
    //check we are logged in
    if(req.session.loggedin){
      console.log("logged in");
      res.redirect('/profile');

      return;
    }

    //we create the data string from the form components that have been passed in
    var datatostore = {
      "name":{"first":req.body.first,"last":req.body.last},
      "email":req.body.email,
      "login":{"username":req.body.username,"password":req.body.password}
    }

      //once created we just run the data string against the database and all our new data will be saved/
      db.collection('people').save(datatostore, function(err, result) {
        if (err) throw err;
        console.log('saved to database')
        //when complete redirect to the index
        res.redirect('/')
      })
    });

    app.post('/updateUser', function(req, res) {
      if(!req.session.loggedin){
        console.log("not logged in");
        res.redirect('/login');
        return;
      }
      if (req.session.user.login.password == req.body.currentPassword){
        db.collection('people').findOne({"login.username":req.session.user.login.username}, function(err, result) {
          db.collection('people').update({"_id":result._id}, {$set: {"name.first": req.body.first, "name.last": req.body.last, "email": req.body.email, "login.username": req.body.username, "login.password": req.body.password}})
          res.redirect('/profile');
        });
      } else {
        res.redirect('/remuser');
        return;
      }
    });
