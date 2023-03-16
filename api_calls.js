const clientId = '47d30d8981be40c9a1b7f5cf4895b0d2';
const redirectUri = 'http://localhost:8008/callback/';
const scopes = 'ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private';
const baseUrl = 'https://api.spotify.com/v1'; //the base URL for the Spotify API endpoints
let currentUser = JSON.parse(localStorage.getItem('currentUser')); //the current user


class User {
    constructor() {
        this.displayName;
        this.profilePicture;
        this.id;

        this.accessToken; 
        this.expirationTime;
    }

	//creates a new user object and sets the access token
	async newUser() {
		this.setAccessToken();
		const userInfo = await this.getUserInfo();
		this.displayName = userInfo.display_name;
		this.profilePicture = userInfo.images[0].url;
		this.id = userInfo.id;

		console.log('new user created');
	}

	setAccessToken() {
		const urlParams = new URLSearchParams(window.location.hash.substring(1)); 
		const accessToken = urlParams.get('access_token'); 
		const expiresIn = urlParams.get('expires_in'); 
		const expirationTime = new Date().getTime() + expiresIn * 1000;

		this.accessToken = accessToken;
		this.expirationTime = expirationTime;
	}

	async getUserInfo() {
		// Get the user info from Spotify
		const url = baseUrl + '/me';
		const response = await fetch(url, {
			headers: {
				'Authorization': 'Bearer ' + this.accessToken
			}
		});
		const userInfo = await response.json();
		return userInfo;
	}

}

function authoriseUser() { 
	console.log('authoriseUser() called');
	const authorisationUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`;
	window.location.href = authorisationUrl;
}

function refreshAccessToken() {
	const refreshAccessTokenUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}&prompt=none`;
	window.location.href = refreshAccessTokenUrl;
}

function logOut() {
	localStorage.removeItem('currentUser');
    const loginPagePath = '/';
	window.location.pathname = loginPagePath;
}

window.onload = async function() {
	if (window.location.hash) { //if the user has just been redirected from the Spotify authorisation page
		try {
			if (currentUser) {
				currentUser.setAccessToken();
				localStorage.setItem('currentUser', JSON.stringify(currentUser));
				window.location.href = 'home.html';
			} else {
				currentUser = new User();
				await currentUser.newUser();
				localStorage.setItem('currentUser', JSON.stringify(currentUser));
				window.location.href = 'home.html';
			}
		} catch (error) {
			console.log(error);
			logOut();
		}
	}


	if (currentUser) { //if the user is already logged in
		const loginPagePath = '/';
		if (window.location.pathname === loginPagePath) { 
			window.location.href = 'home.html'; 
		}

		if (new Date().getTime() > currentUser.expirationTime) { //if the access token has expired
			refreshAccessToken();
		}
		
		document.getElementById('currentUser').src = currentUser.profilePicture;
	}
}



//takes a type (tracks or artists), limit, and time_range and returns the top items for the user based on those parameters
async function getTopItems(type, limit, time_range) {
	return fetch((`${baseUrl}/me/top/${type}?limit=${limit}&time_range=${time_range}`), { 
		headers: {
		'Authorization': 'Bearer ' + currentUser.accessToken
		}
	})
	.then(response => response.json())
	.then(data => data.items)
	.catch(error => console.log(error));
}



/*takes array of track objects and returns an array of track feature objects
max 100 tracks per api call, so if more than 100 tracks are passed, it splits the array into groups of 100 and recursively calls itself then returns the combined array */
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
		.catch (error => console.log(error));
	}
}



//takes a track object and returns an array of recommended tracks based on the track's ID and artist ID
async function getTrackRecommendations(track) {
	seedTracks = track.id;
	seedArtists = track.artists[0].id;

	return fetch((`${baseUrl}/recommendations?seed_tracks=${seedTracks}&seed_artists=${seedArtists}&limit=5`), {
		headers: {
			'Authorization': 'Bearer ' + currentUser.accessToken
		}
	})
	.then(response => response.json())
	.then(data => data.tracks)
	.catch(error => console.log(error));
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



			
