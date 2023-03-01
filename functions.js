const accessToken = localStorage.getItem('accessToken');
const user = JSON.parse(localStorage.getItem('user'));
const baseUrl = 'https://api.spotify.com/v1'; //the base URL for the Spotify API endpoints

window.onload = function() {
	let expirationTime = localStorage.getItem("expirationTime");
	console.log(user.displayName)
  
	if (accessToken && expirationTime) {
	  	if (expirationTime <= new Date().getTime()) { //if the access token has expired (the expiration time is less than or equal to the current time)
			console.log('access token has expired');
			refreshAccessToken(); 
	  	}
	}

	document.getElementById('currentUser').src = user.profilePicture;
	
};


function refreshAccessToken() {
	const clientId = '47d30d8981be40c9a1b7f5cf4895b0d2';
	const redirectUri = encodeURIComponent(window.location.href); //redirects to the current page after access token is refreshed
	const scopes = localStorage.getItem('scopes');

    const refreshAccessTokenUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}&prompt=none`;
    window.location.href = refreshAccessTokenUrl;
	if (window.location.hash) {
		getAccessToken();
	}
}
function getAccessToken() {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = urlParams.get('access_token');
    const expiresIn = urlParams.get('expires_in');
	let expirationTime = new Date().getTime() + expiresIn * 1000;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("expirationTime", expirationTime);
}



//takes a type (tracks or artists), limit, and time_range and returns the top items for the user based on those parameters
function getTopItems(type, limit, time_range) {
	return new Promise((resolve, reject) => { //returns a promise that resolves to the data object returned from the API call
		fetch((baseUrl + '/me/top/' + type + '?limit=' + limit + '&time_range=' + time_range), {
			headers: {
			'Authorization': 'Bearer ' + accessToken
			}
		})
		.then(response => response.json()) 
		.then(data => {
			resolve(data);
		})
		.catch(error => reject(error));
	});
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
		const trackIds = tracks.map(track => track.id).join(','); // gets a comma-separated string of track IDs so it can be passed to the API
		return new Promise((resolve, reject) => {
			fetch((baseUrl + '/audio-features?ids=' + trackIds), {
				headers: {
					'Authorization': 'Bearer ' + accessToken //makes a GET request to the trackAudioFeaturesURL endpoint, passing an object containing a header with the access token as an authorization bearer token.
				}
			})
			.then(response => response.json()) //Converts response from json to js object
			.then(data => {
				let trackArray = data.audio_features;
				resolve(trackArray);
			})
			.catch(error => reject(error));
		});		
	}
}



//takes a track object and returns an array of recommended tracks based on the track's ID and artist ID
function getTrackRecommendations(track) {
	return new Promise((resolve, reject) => {
		seedTracks = track.id;
		seedArtists = track.artists[0].id;

		fetch((baseUrl + '/recommendations?seed_tracks=' + seedTracks + '&seed_artists=' + seedArtists + '&limit=5'), {
			headers: {
				'Authorization': 'Bearer ' + accessToken
			}
		})
		.then(response => response.json())
		.then(data => {
			resolve(data.tracks);
		})
		.catch(error => reject(error));
	});
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



			
