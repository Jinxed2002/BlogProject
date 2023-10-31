 const path = require("path")
const express = require("express")
const session = require("express-session")
const mongoStore = require("connect-mongodb-session")

const db = require("./data/database")
const demoRoutes = require("./routes/demo")

const mongoSessionStore = mongoStore(session)

const app = express()

const sessionStore = new mongoSessionStore({
  uri: "mongodb://127.0.0.1:27017",
  databaseName: "auth-demo",
  collection: "sessions"
})

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

app.use(express.static("public"))
app.use(express.urlencoded({ extended: false }))
app.use(session({
  secret: "sessionSecret",
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}))

app.use(async function(req, res, next) {
  const thisUser = req.session.user
  if(!thisUser){
    return next()
  }
  const matchUser = await db.getDb().collection("users").findOne({_id: thisUser.id})
  const userIsAdmin = matchUser.isAdmin
  res.locals.user = thisUser
  res.locals.isAdmin = userIsAdmin
  next()

})

app.use(demoRoutes)

app.use(function(error, req, res, next) {
  res.render("500")
})

db.connectToDatabase().then(function () {
  app.listen(3000)
})
