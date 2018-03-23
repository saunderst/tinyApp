const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const cookieSession = require('cookie-session')
const bcrypt = require('bcrypt');
const PORT = process.env.PORT || 8080; // default port 8080

// some predefined users for testing
const users = {
  'userRandomID': {
    id: 'userRandomID',
    email: 'user@example.com',
    password: '$2a$10$rUB.To/pAE4zGWrYCWXrK.UNqGrLmrN8u5psJ6LY/4voiuGu9oSwy'
  },
  'user2RandomID': {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: '$2a$10$Nszy9xtgluBRYBDrqXV.B.d.vwanMcj5jhVWFwmzmcoc9/tKsn13y'
  }
};

// a couple of predefined URL mappings
var urlDatabase = {
  'b2xVn2': {
    userID: 'userRandomID',
    longURL: 'http://www.lighthouselabs.ca'
  },
  '9sm5xK': {
    userID: 'user2RandomID',
    longURL: 'http://www.google.com'
  }
};

// filter url database by user ID
function urlsForUser(filterUser) {
  if (!filterUser) {
    return undefined;
  } else {
    let filteredURLs = {};
    for (let url in urlDatabase) {
      if (urlDatabase[url].userID === filterUser.id) {
        filteredURLs[url] = urlDatabase[url];
      }
    }
    return filteredURLs;
  }
}
// for basic method of  tinyURL and user ID generation
function generateRandomString() {
  let rstring = '';
  let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  for (let i = 0; i < 6; i++)
    rstring += chars[Math.floor(Math.random() * chars.length)];
  return rstring;
}

app.set('view engine', 'ejs');

// enable us to use local resources for display
app.use('/public', express.static('public'));

// need this for handling form submission
app.use(bodyParser.urlencoded({ extended: true }));

// handle cookies
app.use(cookieSession({
  name: 'session',
  secret: "Is this really a secret? r7waWquFqMlHIkyGcUBNWrO79cldGsLggM93fKmpaDg=",
  // Cookie Options
  maxAge: 1 * 60 * 60 * 1000 // 1 hour
}));

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// home page
app.get('/', (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    // don't show them anything if they're not logged in
    res.redirect('/login');
  }
});

// display list of existing URL mappings
app.get('/urls', (req, res) => {
  let currentUser = users[req.session.user_id];
  let currentURLs = urlsForUser(currentUser);
  let templateVars = {
    user: currentUser,
    urls: currentURLs
  };
  res.render('urls_index', templateVars);
});

// handle request for new URL mapping
app.post('/urls', (req, res) => {
  if (req.session.user_id) {   // logged in?
    let shortURL = generateRandomString();
    if (req.body.longURL.substring(0, 4) !== 'http') {
      req.body.longURL = 'http://' + req.body.longURL;
    }
    urlDatabase[shortURL] = {
      userID: req.session.user_id,
      longURL: req.body.longURL
    }
    res.redirect('/urls/' + shortURL);
  } else {
    res.redirect('/urls');
  }
});

// handle request to delete existing URL mapping
app.post('/urls/:shortURL/delete', (req, res) => {
  if (req.session.user_id) {   // logged in?
    // doesn't own this URL?
    if (urlDatabase[req.params.shortURL].userID != req.session.user_id) {
      res.status(400).send(req.params.shortURL + ' is owned by another user.');
    } else {
      delete urlDatabase[req.params.shortURL];
    }
  }
  res.redirect('/urls');
});

// handle request to alter existing URL mapping
app.post('/urls/:shortURL/update', (req, res) => {
  if (req.session.user_id) {   // logged in?
    // doesn't own this URL?
    if (urlDatabase[req.params.shortURL].userID != req.session.user_id) {
      res.status(400).send(req.params.shortURL + ' is owned by another user.');
    } else {
      if (req.body.longURL.substring(0, 4) !== 'http') {
        req.body.longURL = 'http://' + req.body.longURL;
      }
      urlDatabase[req.params.shortURL].longURL = req.body.longURL;
    }
    res.redirect('/urls');
  }
});

// be sure this goes before the generic /urls/:id
app.get('/urls/new', (req, res) => {
  if (req.session.user_id) {   // logged in?
    let templateVars = {
      user: users[req.session.user_id]
    };
    res.render('urls_new', templateVars);
  } else {
    // don't let them do it if they're not logged in
    res.redirect('/login');
  }
});

// show the requested URL mapping
app.get('/urls/:shortURL', (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404).send(req.params.shortURL + ' is not a valid URL abbreviation.');
  }
  else if (!req.session.user_id) {   // not logged in?
    res.redirect('/urls');
  }
  else if (urlDatabase[req.params.shortURL].userID != req.session.user_id) {
    res.status(400).send(req.params.shortURL + ' is owned by another user.');
  }
  else {
    let templateVars = {
      user: users[req.session.user_id],
      shortURL: req.params.shortURL,
      urls: urlDatabase
    };
    res.render('urls_show', templateVars);
  }
});

app.get('/u/:shortURL', (req, res) => {
  if (!urlDatabase[req.params.shortURL])
    res.status(404).send(req.params.shortURL + ' is not a valid URL abbreviation.');
  else
    res.redirect(urlDatabase[req.params.shortURL].longURL);
});

// login request: set cookie
app.post('/login', (req, res) => {
  let userFound = false;
  for (let user in users) {
    if (users[user].email === req.body.email && bcrypt.compareSync(req.body.password, users[user].password)) {
      userFound = true;
      req.session.user_id = users[user].id;
      res.redirect('/urls');
      break;
    }
  }
  if (!userFound) {
    res.status(400).send('Sorry, we don\'t know you.');
  }
});

// logout request: delete cookie
app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

// display the registration form
app.get('/register', (req, res) => {
  if (req.session.user_id) {   // logged in?
    res.redirect('/urls');
  } else {
    res.render('register');
  }
});

// handle submission from  the registration form
app.post('/register', (req, res) => {
  if (req.body.email === '' || req.body.password === '') {
    res.status(400).send('Missing email and/or password.');
  } else {
    for (let user in users) {
      if (users[user].email === req.body.email) {
        res.status(400).send('Email already registered.');
        return;
      }
    }
    let newUser = generateRandomString();
    users[newUser] = {
      id: newUser,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    req.session.user_id = users[newUser].id;
    res.redirect('/urls');
  }
});

// display the login page
app.get('/login', (req, res) => {
  if (req.session.user_id) {   // logged in?
    res.redirect('/urls');
  } else {
    res.render('login');
  }
});
