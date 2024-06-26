
const express = require("express");
const app = express();

// Serve contents of the "public" folder
app.use(express.static("public"));

// Serve the "login.html" file FIRST
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/login.html");
});

// Serve the "stats.html" file
app.get("/stats.html", (req, res) => {
    res.sendFile(__dirname + "/stats.html");
});

// Serve the "home.html" file
app.get("/home.html", (req, res) => {
    res.sendFile(__dirname + "/home.html");
});

// Serve the "recommendations.html" file
app.get("/recommendations.html", (req, res) => {
    res.sendFile(__dirname + "/recommendations.html");
});

// Serve the "quiz.html" file
app.get("/quiz.html", (req, res) => {
    res.sendFile(__dirname + "/quiz.html");
});




// Serve the "api_calls.js" file
app.get("/api_calls.js", (req, res) => {
    res.set('Content-Type', 'application/javascript');
    res.sendFile(__dirname + "/api_calls.js");
});

// Serve the "statistics_viewer.js" file
app.get("/statistics_viewer.js", (req, res) => {
    res.set('Content-Type', 'application/javascript');
    res.sendFile(__dirname + "/statistics_viewer.js");
});

// Serve the "recommendations.js" file
app.get("/recommendations.js", (req, res) => {
    res.set('Content-Type', 'application/javascript');
    res.sendFile(__dirname + "/recommendations.js");
});

// Serve the "quiz.js" file
app.get("/quiz.js", (req, res) => {
    res.set('Content-Type', 'application/javascript');
    res.sendFile(__dirname + "/quiz.js");
});


//serve the "questions.json" file
app.get("/questions.json", (req, res) => {
    res.set('Content-Type', 'application/json');
    res.sendFile(__dirname + "/questions.json");
});



app.get("/callback/", (req, res) => {
    res.redirect("/");
});

// Listen on a specific port
app.listen(8008, () => {
    console.log("Server started on http://localhost:8008");
});
