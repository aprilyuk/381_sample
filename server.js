const assert = require('assert');

const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const mongourl = 'mongodb+srv://user:user@cluster0.ormdivk.mongodb.net/?retryWrites=true&w=majority'; 
const dbName = '381project';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const session = require('cookie-session');
const SECRETKEY = 'cs381';
const moment = require('moment');

var documents = {};
//Main Body
app.set('view engine', 'ejs');
app.use(session({
    userid: "session",  
    keys: SECRETKEY,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const createDocument = function(db, createddocuments, callback){
    const client = new MongoClient(mongourl);
    client.connect(function(err) {
        assert.equal(null, err);
        console.log("Connected successfully to the MongoDB database server.");
        const db = client.db(dbName);

        db.collection('Books').insertOne(createddocuments, function(error, results){
            if(error){
            	throw error
            };
            console.log(results);
            return callback();
        });
    });
}

const findDocument =  function(db, criteria, callback){
    let cursor = db.collection("Books").find({"Name" : new RegExp(criteria.Name, "i")});
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray(function(err, docs){
        assert.equal(err, null);
        console.log(`findDocument: ${docs.length}`);
        return callback(docs);
    });
}

const findUser =  function(db, criteria, callback){
    let cursor = db.collection('login').find(criteria);
    console.log(`findUser: ${JSON.stringify(criteria)}`);
    cursor.toArray(function(err, docs){
        assert.equal(err, null);
        console.log(`findUser: ${docs.length}`);
        return callback(docs);
    });
}

const handle_Find = function(res){
    const client = new MongoClient(mongourl);
    client.connect(function(err) {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let document = {}
        document.Name = ""
        findDocument(db, document, function(docs){
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('display', {nItems: docs.length, items: docs});
        });
    });
}

const handle_Edit = function(res, bookName) {
    const client = new MongoClient(mongourl);
    client.connect(function(err) {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        const criteria = { Name: bookName };
        const cursor = db.collection('Books').find(criteria);

        cursor.toArray(function(err, docs) {
            client.close();
            assert.equal(err, null);
            
            res.status(200).render('edit', {
                item: docs[0],
                type: ["Child", "Adult"],
                themes: ["Education", "Computer", "Novel", "Literature"]
            });
        });
    });
};

const handle_Details = function(res, criteria) {
    const client = new MongoClient(mongourl);
    client.connect(function(err) {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let document = {};
        document.Name = criteria
        findDocument(db, document, function(docs) {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('details', { item: docs[0] });
        });
    });
}

const updateDocument = function (criteria, updatedocument, callback) {
    const client = new MongoClient(mongourl);
    client.connect(function (err) {
      assert.equal(null, err);
      console.log("Connected successfully to server");
      const db = client.db(dbName);
      console.log(criteria);
      console.log(updatedocument);
  
      db.collection('Books').updateOne(criteria, {
        $set: updatedocument
      }, function (err, results) {
        client.close();
        assert.equal(err, null);
        return callback(results);
      });
    });
  };


const deleteDocument = function(db, criteria, callback) {
    db.collection('Books').deleteOne(criteria, function(err, results) {
        assert.equal(err, null);
        console.log(results);
        return callback();
    });
};

const handle_Delete = function(res, bookName) {
    const client = new MongoClient(mongourl);
    client.connect(function(err) {
      console.log("Connected successfully to server");
      const db = client.db(dbName);
  
      const criteria = { Name: bookName };
  
      deleteDocument(db, criteria, function() {
        client.close();
        console.log("Closed DB connection");
        res.status(200).render('delete', { item: { Name: bookName } });
      });
    });
};

app.get('/', function(req, res){
    if(!req.session.authenticated){
        console.log("Incorrect username or password, please try again.; directing to login");
        res.redirect("/login");
    }else{
    	res.redirect("/login");
    }
    console.log("...Hello, welcome back");
});

//login
app.get('/login', function(req, res){
    console.log("...Welcome to login page.")
    return res.status(200).render("login");
});

app.post('/login', function(req, res){
    console.log("...Handling your login request");
    const client = new MongoClient(mongourl);
    client.connect(function(err){
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
    
        var userID = req.body.username;
        var userPassword = req.body.password;
    
        if (userID && userPassword){
            console.log("...Logining");
            var criteria = {
                name: userID,
                password: userPassword
            };
            findUser(db, criteria, function(docs){
                client.close();
                console.log("Closed DB connection");
                if (docs.length > 0) {
                    req.session.authenticated = true;
                    req.session.userID = userID;
                    console.log(req.session.userID);
                    res.status(200).render('home');
                }
                else{
                    console.log("user ID is incorrect!");
                    res.status(200).redirect('/');
                }
            });
        }
        else{
            console.log("user ID is incorrect!");
            res.status(200).redirect('/');
        }
    });
});

app.get('/logout', function(req, res){
    req.session = null;
    req.authenticated = false;
    res.redirect('/login');
});

app.get('/home', function(req, res){
    console.log("...Welcome to the home page!");
    return res.status(200).render("home");
});

app.get('/list', function(req, res){
    console.log("Show all books! ");
    handle_Find(res,req.query.docs);
});

app.get('/find', function(req, res){
    return res.status(200).render("search");
});

app.post('/search', function(req, res){
    const client = new MongoClient(mongourl);
    client.connect(function(err){
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
    
    const searchBook={};
    searchBook["Name"] = req.body.bookname;
    
    if (searchBook.Name){
    console.log("...Searching the document");
    findDocument(db, searchBook, function(docs){
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('display', {nItems: docs.length, items: docs});
        });
    }
    else{
    console.log("Invalid Entry - Book name is compulsory for searching!");
    res.status(200).redirect('/find');
    }         	
	});
});

app.get('/details', function(req, res){
    handle_Details(res);
});

app.get('/edit', function(req, res) {
    const bookName = req.params.bookName;
    handle_Edit(res, bookName);
});

app.get('/create', function(req, res){
    return res.status(200).render("create", { type: ["Chlid", "Adult"], themes: ["Education", "Computer", "Novel", "Literature"] });
});

app.post('/create', function(req, res){
    const client = new MongoClient(mongourl);
    client.connect(function(err){
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
        const booksCollection = db.collection("Books");
        const documents = {} //init docs
        // TODO: check if bookname exist, add book fail, after finish search function
        booksCollection
            .find({})
            .sort({ Code: -1 })
            .limit(1)
            .toArray(function(err, books) {
                if (err) {
                    console.error(err);
                    return res.status(500).render('info', { message: 'Error occurred while fetching books' });
                } else {
                  if (books.length > 0) {
                    NextInsertBookCode = (Number(books[0].Code)+1).toString().padStart(3,'0');
                    console.log(books[0].Code);
                    console.log('Book Code: ', NextInsertBookCode);
                  } else {
                    console.log('No books found.');
                    NextInsertBookCode = "001";
                  }
                }
            
        booksCollection.findOne({Name: req.body.name}, function(err, book) {
            if (err) {
                console.error(err);
                client.close();
                return res.status(200).render('info', {message: 'Error occurred while fetching book' });
            }
            
            if (!book) {
                // No book found
                console.log("Book name not repeated. Allow to add.");
                documents["Name"] = req.body.name;
            }
            else{
                return res.status(200).render('info', {message: "Invalid entry - This book already exist"});
            }
            console.log("Book name: ", req.body.name)
            
        documents["_id"] = new ObjectID();
        documents['Author']= req.body.author;
        documents['Code']= NextInsertBookCode;
        documents['Type']= req.body.selectedTypes;
        console.log("Type: ",documents['Type'])
        const themes = req.body.selectedThemes || [];
        documents['Theme'] = themes;
        console.log("Theme: ",documents['Theme'])
        documents['Status']= "Available";
        if (moment(req.body.launchdate, 'DD-MM-YYYY', true).isValid()&&moment(req.body.launchdate).isSameOrBefore(moment().startOf('day'))) {
            documents['LaunchDate']= req.body.launchdate;
          } else {
            client.close();
            console.log("Closed DB connection");
            return res.status(200).render('info', {message: "Invalid entry - Launch Date is wrong format!"});
          }
        documents['BorrowRecord']= [];
        console.log("...putting book data into documents");
        
        if(documents.Name&&documents.Author&&documents.Type&&documents.Theme.length > 0&&documents.LaunchDate){
            console.log("...Adding the document");
            createDocument(db, documents, function(docs){
                client.close();
                console.log("Closed DB connection");
                return res.status(200).render('info', {message: "Book added successfully!"});
            });
        }else{
            client.close();
            console.log("Closed DB connection");
            return res.status(200).render('info', {message: "Invalid entry - Some block is missing input!"});
        }
    });
    });
    });
});

app.post('/update', function(req, res) {
    const client = new MongoClient(mongourl);
    client.connect(function(err) {
      assert.equal(null, err);
      console.log("Connected successfully to server");
      const db = client.db(dbName);
  
      const criteria = { Name: req.body.bookName };
      const updatedDocument = {
        Name: req.body.bookName,
        Author: req.body.author,
        Type: req.body.type,
        Theme: req.body.theme,
        LaunchDate: req.body.launchDate
      };
  
      updateDocument(criteria, updatedDocument, function(results) {
        client.close();
        console.log("Closed DB connection");
        res.redirect('/details/' + req.body.bookName);
      });
    });
});

app.get('/delete', function(req, res) {
    const bookName = req.params.bookName;
    handle_Delete(res, bookName);
  });

//Restful
//insert
app.get('/api/create/:name/:author/:type/:theme/:launchdate', function(req, res) {
    MongoClient.connect(mongourl, function(err, client) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error connecting to the database' });
      }
  
      const db = client.db(dbName);
      const booksCollection = db.collection('Books');
      documents = {}
      
      booksCollection
        .find({})
        .sort({ Code: -1 })
        .limit(1)
        .toArray(function(err, books) {
          if (err) {
            console.error(err);
            client.close();
            return res.status(500).json({ error: 'Error occurred while fetching books' });
          }
  
          let nextInsertBookCode;
          if (books.length > 0) {
            nextInsertBookCode = (Number(books[0].Code) + 1).toString().padStart(3, '0');
            console.log('Book Code:', nextInsertBookCode);
          } else {
            nextInsertBookCode = '001';
            console.log('No books found.');
          }

          booksCollection.findOne({Name: req.params.name}, function(err, book) {
            if (err) {
                console.error(err);
                client.close();
                return res.status(500).json({ error: 'Error occurred while fetching book' });
            }
            
            if (!book) {
                // No book found
                console.log("Book name not repeated. Allow to add.");
                documents["Name"] = req.params.name;
            }
            else{
                console.log("Invalid entry - This book already exist");
                return res.status(200).json({ error: "Invalid entry - This book already exist"});
            }
            console.log("Book name: ", req.params.name)
            
          documents = {
            _id: new ObjectID(),
            Author: req.params.author,
            Code: nextInsertBookCode,
            Type: req.params.type,
            Theme: req.params.theme.split(',').filter(theme => theme !== "").map(theme => theme.trim()),
            Status: "Available",
            LaunchDate: moment(req.params.launchdate, 'DD-MM-YYYY', true).isValid() ? req.params.launchdate : null,
            BorrowRecord: []
          };
          console.log("Type: ", documents.Type);
          console.log("Theme: ", documents.Theme);
  
          if (documents.Name && documents.Author && documents.Type && documents.Theme.length > 0 && documents.LaunchDate) {
            if(documents.Type == "Child" || documents.Type == "Adult"){
                if(documents.Theme.every(theme => theme === "Computer" || theme === "Education" || theme === "Novel" || theme === "Literature")){
                    createDocument(db, documents, function(docs) {
                    client.close();
                    console.log("Closed DB connection");
                    console.log("Book added successfully!");
                    return res.status(200).json({ message: "Book added successfully!" });
                    });
                } else {
                    client.close();
                    console.log("Closed DB connection");
                    console.log("Invalid entry - Theme must be Computer/Education/Novel/Literature");
                    return res.status(400).json({ error: "Invalid entry - theme must be Computer/Education/Novel/Literature" });
                }
                }else{
                    client.close();
                    console.log("Closed DB connection");
                    console.log("Invalid entry - Type should be Adult/Chlid")
                    return res.status(400).json({ error: "Invalid entry - Type should be Adult/Chlid" });
                }
            }
            else {
                client.close();
                console.log("Closed DB connection");
                console.log("Invalid entry - Some block is missing input or Launch Date is in the wrong format")
                return res.status(400).json({ error: "Invalid entry - Some block is missing input or Launch Date is in the wrong format" });
        }
    });
    });
  });
});

//find
app.get('/api/search/:name', function(req,res) {
    if (req.params.name) {
        let criteria = {};
        criteria['Name'] = req.params.name;
        const client = new MongoClient(mongourl);
        client.connect(function(err) {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, function(docs){
                client.close();
                console.log("Closed DB connection");
                let formattedResponse = `<pre>${JSON.stringify(docs, null, 2)}</pre>`;
                res.status(200).send(formattedResponse);
            });
        });
    } else {
        res.status(500).json({"error": "Invalid Entry - Book name is compulsory for searching!"});
    }
})

// delete
app.post('/delete', function(req, res) {
    const client = new MongoClient(mongourl);
    client.connect(function(err) {
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
        const booksCollection = db.collection("Books");

        const criteria = { Name: req.body.bookName };
        booksCollection.deleteOne(criteria, function(err, result) {
            if (err) {
                console.error(err);
                client.close();
                return res.status(500).render('info', { message: 'Error occurred while deleting book' });
            }
            console.log("Book deleted successfully");
            client.close();
            return res.status(200).render('info', { message: 'Book is successfully deleted.' });
        });
    });
});

app.listen(app.listen(process.env.PORT || 8099));
