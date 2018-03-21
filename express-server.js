const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080; // default port 8080

// for first pass at tinyURL generation
function generateRandomString() {
  let rstring = "";
  let chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  for (let i = 0; i < 6; i++)
    rstring += chars[Math.floor(Math.random() * chars.length)];
  return rstring;
}

app.set("view engine", "ejs");

// enable us to use local resources for display
app.use("/public", express.static('public'));

// a couple of predefined URL mappings
var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/", (req, res) => {
  res.end("Hello!");    // just being friendly
});

// display list of existing URL mappings
app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

// need this for handling form submission
app.use(bodyParser.urlencoded({extended: true}));

// handle request for new URL mapping
app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  if (req.body.longURL.substring(0,4) !== "http")
    req.body.longURL = "http://" + req.body.longURL;
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect('http://localhost:8080/urls/' + shortURL);
});

// handle request for new URL mapping
app.post("/urls/:id/delete", (req, res) => {
  if (!urlDatabase[req.params.id])
    res.redirect('http://localhost:8080/urls');
  else {
    delete urlDatabase[req.params.id];
  }
  res.redirect('http://localhost:8080/urls');
});

// be sure this goes before the generic /urls/:id
app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

// show the requested URL mapping
app.get("/urls/:id", (req, res) => {
  let templateVars = { shortURL: req.params.id, urls: urlDatabase };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  if (!longURL)
    res.redirect('http://localhost:8080/urls');
  else
    res.redirect(longURL);
});