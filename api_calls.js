/* This file contains the code for functions that make API calls to the Spotify Web API.
and other functions that are used to authorise the user and store their access token.
Also contains other reusable functions. */

// The clientId is the unique identifier for the application (registered with Spotify)
const clientId = '47d30d8981be40c9a1b7f5cf4895b0d2';
// The redirectUri is the URL that the user will be redirected to after authorisation
const redirectUri = 'http://localhost:8008/callback/';
// The scopes are the permissions that the application is requesting from the user
const scopes = 'ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private';
// The baseUrl for all Spotify Web API requests (specific endpoints are added to this)
const baseUrl = 'https://api.spotify.com/v1';
// The currentUser variable is used to store the current user's info, stored in localStorage so that it persists between page refreshes
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

/* Class that represents the current user. 
Generates and stores the access token,
and gets the user's display name and profile picture from the Spotify API */
class User {
    constructor() {
        this.displayName;
        this.profilePicture;
        this.accessToken; 
        this.expirationTime;
    }

	/* Creates a new user object by calling the setAccessToken() and getUserInfo() methods 
	to fill the user's properties. */
	async newUser() {
		this.setAccessToken();
		const userInfo = await this.getUserInfo();
		this.displayName = userInfo.display_name;
		this.profilePicture = userInfo.images[0].url;
	}

	/* Sets the access token and expiration time by extracting them from the URL hash
	after the user has been redirected back to the login page from the Spotify authorisation page. */
	setAccessToken() {
		const urlParams = new URLSearchParams(window.location.hash.substring(1)); 
		const accessToken = urlParams.get('access_token'); 
		const expiresIn = urlParams.get('expires_in'); 
		const expirationTime = new Date().getTime() + expiresIn * 1000;
		this.accessToken = accessToken;
		this.expirationTime = expirationTime;
	}

	/* Retrieves the user'sinfo from the Spotify API
	from the Get Current User's Profile endpoint */
	async getUserInfo() {
		// The endpoint URL for the Get Current User's Profile endpoint
		const endpointUrl = baseUrl + '/me';
		// Make a GET request to the endpoint URL with the access token
		const response = await fetch(endpointUrl, {
			headers: {
				'Authorization': 'Bearer ' + this.accessToken
			}
		});
		// Get the response from the GET request and return it as JSON
		const userInfo = await response.json();
		return userInfo;
	}

}

// Redirects a new user to the Spotify authorisation page
function authoriseUser() { 
	// URL for the Spotify authorisation endpoint, so that the user can log in and authorise the application
	const authorisationUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`;
	window.location.href = authorisationUrl;
}

// Redirects an existing user to the Spotify authorisation page if their access token has expired
function refreshAccessToken() {
	alert('Session expired. Relogging in...');
	// prompt=none prevents the user from being prompted to log in again
	const refreshAccessTokenUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}&prompt=none`;
	window.location.href = refreshAccessTokenUrl;
}

// Handles the user redirection from the Spotify authorisation page
async function redirectFromAuthorisation() {
	try {
		// If user already exists, update their access token
		if (currentUser) {
			currentUser.setAccessToken();
		} else { // If a user doesn't exist, create a new user object
			currentUser = new User();
			await currentUser.newUser();
		}
		// Store the user object in localStorage to save it between page refreshes
		localStorage.setItem('currentUser', JSON.stringify(currentUser));
		window.location.href = 'home.html';
	} catch (error) {
		alert('Error logging in. Please try again.')
		logOut();
	}
}

function checkAccessTokenExpiration() {
	if (new Date().getTime() > currentUser.expirationTime) {
		refreshAccessToken();
	}
}

/* Logs the user out by removing the currentUser object from localStorage
and redirecting the user to the login page */
function logOut() {
	localStorage.removeItem('currentUser');
    const loginPagePath = '/';
	window.location.pathname = loginPagePath;
}

/* Function that is called every time the page is loaded.
Checks if the user has just been redirected from the Spotify authorisation page,
and calls the redirectFromAuthorisation() function if so.
If user is logged in, performs some checks and sets the profile picture */
window.onload = async function() {
	if (window.location.hash) { //if the user has just been redirected from the Spotify authorisation page
		await redirectFromAuthorisation();
	}
	if (currentUser) {
		// Redirects the user to the home page if they are already logged in and try to access the login page
		const loginPagePath = '/';
		if (window.location.pathname === loginPagePath) { 
			window.location.href = 'home.html'; 
		}
		checkAccessTokenExpiration();
		document.getElementById('currentUser').src = currentUser.profilePicture;
	}
}


/* The following functions are different endpoints from the Spotify Web API,
to get data used in multiple pages in the application */


/* Calls the Get User's Top Items endpoint
and returns an array of the user's top tracks or artists based on the parameters passed */
async function getTopItems(type, limit, time_range) {
	return fetch((`${baseUrl}/me/top/${type}?limit=${limit}&time_range=${time_range}`), { 
		headers: {
		'Authorization': 'Bearer ' + currentUser.accessToken
		}
	})
	.then(response => response.json())
	// only returns the relevant data from the response (the array of items)
	.then(data => data.items)
	.catch(error => handleApiError(error)); 
}


/* Calls Get Tracks' Audio Features endpoint to get the audio features of an array of tracks
max 100 tracks per api call, so if the list is longer than 100 tracks, it is split into groups of 100 tracks
and the function is called recursively until all tracks have been processed */
async function getTracksAudioFeatures(tracks) {
	if (tracks.length > 100) {
		let trackArray = [];
		for (let i = 0; i < tracks.length; i += 100) {
			let trackGroup = tracks.slice(i, i + 100);
			trackArray = trackArray.concat(await getTracksAudioFeatures(trackGroup));
		}
		return trackArray;	
	} else {
		const trackIds = tracks.map(track => track.id).join(',');
		return fetch((`${baseUrl}/audio-features?ids=${trackIds}`), {
			headers: {
				'Authorization': 'Bearer ' + currentUser.accessToken
			}
		})
		.then(response => response.json())
		.then(data => data.audio_features)
		.catch (error => handleApiError(error));
	}
}


/* Calls the Get Recommendations endpoint to get 5 recommended tracks based on track and its artist */
async function getTrackRecommendations(track) {
	seedTracks = track.id;
	seedArtists = track.artists[0].id;
	return fetch((`${baseUrl}/recommendations?seed_tracks=${seedTracks}&seed_artists=${seedArtists}&limit=5`), {
		headers: {
			'Authorization': 'Bearer ' + currentUser.accessToken
		}
	})
	.then(response => response.json())
	// only returns the relevant data from the response (the array of tracks)
	.then(data => data.tracks)
	.catch(error => handleApiError(error));
}


function handleApiError(error) {
	if (error.status === 401) {
		refreshAccessToken();
	} else {
		alert('Error loading data. Please try again or log out and log back in.');
	}
}



// recursive merge sort function to sort an array of either normal values or objects (by a specified attribute)
function mergeSort(array, attribute) {
	if (array.length === 1) {
		return array;
	}
	const middleIndex = Math.floor(array.length / 2);
	const leftHalf = array.slice(0, middleIndex);
	const rightHalf = array.slice(middleIndex);
	return merge(
		mergeSort(leftHalf, attribute),
		mergeSort(rightHalf, attribute),
		attribute
	);
}
function merge(leftHalf, rightHalf, attribute) {
	const sortedArray = [];
	while (leftHalf.length && rightHalf.length) {
		if (attribute) { //if attribute is passed, sort by that attribute
			if (leftHalf[0][attribute] < rightHalf[0][attribute]) {
				sortedArray.push(leftHalf.shift());
			} else {
				sortedArray.push(rightHalf.shift());
			}
	  	} else { //otherwise sort by value of element
			if (leftHalf[0] < rightHalf[0]) {
				sortedArray.push(leftHalf.shift());
			} else {
				sortedArray.push(rightHalf.shift());
			}
	  	}
	}
	return [...sortedArray, ...leftHalf, ...rightHalf];
}



			
