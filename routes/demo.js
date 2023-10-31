const express = require("express")
const bcrypt = require("bcryptjs")

const mongodb = require("mongodb")
const ObjectId = mongodb.ObjectId

const db = require("../data/database")

const router = express.Router()

// router.get("/", function (req, res) {
//   res.render("welcome")
// })

router.get('/', function(req, res) {
  res.render('welcome')
})

router.get('/posts', async function(req, res) {
  // const posts = await db.getDb().collection("posts").find({}, {title: 1, summary: 1}).toArray()
  
  const posts = await db.getDb().collection("posts").find().toArray()
  console.log("In the post get route")
  res.render('posts-list', {posts: posts})
})

router.get('/new-post', async function(req, res) {
  const authlist = await db.getDb().collection("authors").find().toArray()
  res.render('create-post', {authors: authlist})
})

router.post("/posts", async function(req, res) {
  const newPost = {
    title: req.body.title,
    summary: req.body.summary,
    content: req.body.content,
    email: req.session.user.email,
    createdAt: new Date(),
  }
  const result = await db.getDb().collection("posts").insertOne(newPost)
  console.log(result)
  res.redirect("/posts")
})

router.get("/posts/:id", async function(req, res) {
  const postID = new ObjectId(req.params.id)
  const post = await db.getDb().collection("posts").findOne({_id: postID})
  post.date = post.createdAt.toISOString()
  post.readableDate = post.createdAt.toLocaleDateString("en-GB", {weekday: "long", year: "numeric", month: "long", day: "numeric"})
  if(!post) {
    return res.status(404).render("404")
  }
  res.render("post-detail", {postDetail: post})
})

router.get("/signup", function (req, res) {
  let sessionedData = req.session.signupInput
  if(!sessionedData){
    sessionedData = {
      invalidity: false,
      email: "",
      confirmationEmail: "",
      password: ""
    }
  }
  req.session.signupInput = null
  res.render("signup", {preset: sessionedData})
})

router.get("/login", function (req, res) {
  let sessionedData = req.session.loginInput
  if(!sessionedData){
    sessionedData = {
      userExists: true,
      email: "",
      password: ""
    }
  }
  req.session.loginInput = null
  res.render("login", {preset: sessionedData})
})

router.post("/signup", async function (req, res) {
  const userdata = req.body
  const email = userdata.email
  const confirmationEmail = userdata["confirm-email"]
  const password = userdata.password

  if(!email 
    || !confirmationEmail 
    || !password 
    || password.trim() < 6 
    || email != confirmationEmail
    || !confirmationEmail.includes("@")) {
    req.session.signupInput = {
      invalidity: true,
      message: "Invalid input, please re-enter your details.",
      email: email,
      confirmationEmail: confirmationEmail,
      password: password
    }
    req.session.save(function() {
      res.redirect("/signup")
    })
    return
  }

  const userCheck = await db.getDb().collection("users").findOne({userEmail : email})
  if(userCheck) {
    req.session.signupInput = {
      userExists: true,
      message: "A user with this E-mail already exists!",
      email: email,
      confirmationEmail: confirmationEmail,
      password: password
    }
    req.session.save(function() {
      return res.redirect("/signup")
    })
    return
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  
  const user = {
    userEmail: email,
    userPassword: hashedPassword
  }
  await db.getDb().collection("users").insertOne(user)
  res.redirect("/login")
})

router.post("/login", async function (req, res) {
  const logindata = req.body
  const loginEmail = logindata.email
  const loginPassword = logindata.password
  
  const user = await db.getDb().collection("users").findOne({userEmail: loginEmail})
  if(!user) {
    req.session.loginInput = {
      userExists: false,
      message: "No user with matching credentials.",
      email: loginEmail,
      password: loginPassword
    }
    req.session.save(function() {
      return res.redirect("/login")
    })
    return
  }
  
  const passwordCheck = await bcrypt.compare(loginPassword, user.userPassword)
  if(!passwordCheck) {
    req.session.loginInput = {
      userExists: false,
      message: "No user with matching credentials.",
      email: loginEmail,
      password: loginPassword
    }
    req.session.save(function() {
      return res.redirect("/login")
    })
    return
  }

  req.session.user = {id: user._id, email: user.userEmail}
  req.session.save(function () {
    console.log("Authentication successful")
    res.redirect("/profile")
  })
})

router.get("/admin", async function (req, res) {
  if(!req.session.user){
    return res.status(401).render("401")
  }

  const user = await db.getDb().collection("users").findOne({_id: req.session.user.id})
  if(!user || !user.isAdmin){
    return res.status(403).render("403")
  }

  res.render("admin")
})

router.get("/profile", async function (req, res) {
  if(!req.session.user){
    return res.status(401).render("401")
  }
  const posts = await db.getDb().collection("posts").find({email: req.session.user.email}).toArray()
  res.render("profile", {myPosts: posts})
})

router.post("/logout", function (req, res) {
  req.session.user = null
  res.redirect("/")
})

module.exports = router