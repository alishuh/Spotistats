class User {
    constructor(userInfo, name = null) {
        this.displayName = userInfo.display_name;
        this.profilePicture = userInfo.images[0].url;
        this.id = userInfo.id;
        this.county = userInfo.country;
        this.name = name;
    }
}

const clientId = '47d30d8981be40c9a1b7f5cf4895b0d2';
const redirectUri = 'http://localhost:8008/callback/';
const scopes = 'ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private';
localStorage.setItem("scopes", scopes);

function login() { 
    let url = 'https://accounts.spotify.com/authorize?client_id=' + clientId + '&response_type=token&redirect_uri=' + redirectUri + '&scope=' + scopes;
    window.location.href = url;
}


function getAccessToken() {
    const urlParams = new URLSearchParams(window.location.hash.substring(1)); //gets the hash from the URL and removes the # character
    const accessToken = urlParams.get('access_token'); //gets the access token from the hash 
    const expiresIn = urlParams.get('expires_in'); //gets the expiration time from the hash (the time in seconds until the access token expires)
    let expirationTime = new Date().getTime() + expiresIn * 1000;  
    localStorage.setItem("accessToken", accessToken); //stores access token in local storage to access in other web pages
    localStorage.setItem("expirationTime", expirationTime); //stores expiration time in local storage to access in other web pages
}




function getUserInfo() {
    const userInfoUrl = 'https://api.spotify.com/v1/me';
    let accessToken = localStorage.getItem("accessToken");
    fetch(userInfoUrl, { 
        headers: {
            'Authorization': 'Bearer ' + accessToken //makes a GET request to the userInfoUrl endpoint, passing an object containing a header with the access token as an authorization bearer token.
        }
    })
    .then(response => response.json()) //Converts response from json to js object
    .then(data => { 
        //creates a new user object and stores it in local storage
        let user = new User(data);
        localStorage.setItem("user", JSON.stringify(user)); 
        loggedIn();
    })
    .catch(error => console.log(error));
}


function loggedIn() {
    window.location.href = "home.html";
}


function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("expiresIn");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

window.onload = function() {
    if (window.location.hash) {
        getAccessToken(); 
        if (localStorage.getItem("accessToken")) { 
            getUserInfo(); 
        }
    }
}