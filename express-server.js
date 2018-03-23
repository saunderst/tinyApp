const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser')
const PORT = process.env.PORT || 8080; // default port 8080

// some predefined users
const users = {
  'userRandomID': {
    id: 'userRandomID',
    email: 'user@example.com',
    password: 'purple-monkey-dinosaur'
  },
  'user2RandomID': {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: 'dishwasher-funk'
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

// for first pass at tinyURL generation
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
// for eyeing people's cookies
app.use(cookieParser())

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get('/', (req, res) => {
  res.end('Hello!');    // just being friendly, maybe a bit loud
});

// display list of existing URL mappings
app.get('/urls', (req, res) => {
  let templateVars = {
    user: users[req.cookies['user_id']],
    urls: urlDatabase
  };
  res.render('urls_index', templateVars);
});

// need this for handling form submission
app.use(bodyParser.urlencoded({ extended: true }));

// handle request for new URL mapping
app.post('/urls', (req, res) => {
  let shortURL = generateRandomString();
  if (req.body.longURL.substring(0, 4) !== 'http') {
    req.body.longURL = 'http://' + req.body.longURL;
  }
  urlDatabase[shortURL] = {
    userID: req.cookies.user_id,
    longURL: req.body.longURL
  }
  res.redirect('/urls');
});

// handle request to delete existing URL mapping
app.post('/urls/:shortURL/delete', (req, res) => {
  if (urlDatabase[req.params.shortURL] &&
    (urlDatabase[req.params.shortURL].userID === req.cookies.user_id)) {
    delete urlDatabase[req.params.shortURL];
  }
  res.redirect('/urls');
});

// handle request to alter existing URL mapping
app.post('/urls/:shortURL/update', (req, res) => {
  if (urlDatabase[req.params.shortURL].userID === req.cookies.user_id) {
    if (req.body.longURL.substring(0, 4) !== 'http') {
      req.body.longURL = 'http://' + req.body.longURL;
    }
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
  }
  res.redirect('/urls');
});

// be sure this goes before the generic /urls/:id
app.get('/urls/new', (req, res) => {
  if (users[req.cookies.user_id]) {
    let templateVars = {
      user: users[req.cookies.user_id]
    };
    res.render('urls_new', templateVars);
  } else {
    // don't let them do it if they're not logged in
    res.redirect('/login');
  }
});

// show the requested URL mapping
app.get('/urls/:id', (req, res) => {
  let templateVars = {
    user: users[req.cookies.user_id],
    shortURL: req.params.id,
    urls: urlDatabase
  };
  res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  let longURL = urlDatabase[req.params.shortURL].longURL;
  if (!longURL)
    res.redirect('/urls');
  else
    res.redirect(longURL);
});

// login request: set cookie
app.post('/login', (req, res) => {
  let userFound = false;
  for (let user in users) {
    if (users[user].email === req.body.email && users[user].password === req.body.password) {
      userFound = true;
      res.cookie('user_id', users[user].id);
      res.redirect('/urls');
      break;
    }
  }
  if (!userFound) {
    res.redirect('/register');
  }
});

// logout request: delete cookie
app.get('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

// display the registration form
app.get('/register', (req, res) => {
  res.render('register');
});

// handle submission from  the registration form
app.post('/register', (req, res) => {
  if (req.body.email === '' || req.body.password === '') {
    res.status(400).send('We\'re gonna need values for email and password.');
  } else {
    for (let user in users) {
      if (users[user].email === req.body.email) {
        res.status(400).send('Don\'t use somebody else\'s email.  Please.');
        return;
      }
    }
    let newUser = generateRandomString();
    users[newUser] = {
      id: newUser,
      email: req.body.email,
      password: req.body.password
    };
    res.cookie('user_id', users[newUser].id);
    res.redirect('/urls');
  }
});

// display the login page
app.get('/login', (req, res) => {
  res.render('login');
});
