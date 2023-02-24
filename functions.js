let accessToken = localStorage.getItem('accessToken');
let baseUrl = 'https://api.spotify.com/v1';
let userInfoUrl = 'https://api.spotify.com/v1/me'; //the URL for the Spotify API endpoint to retrieve the user's information
let topItemsUrl = 'https://api.spotify.com/v1/me/top/'; // ^^ user's top items

window.onload = function () {

	if (!accessToken) {
		return
	}

	fetch(userInfoUrl, {
		headers: {
			'Authorization': 'Bearer ' + accessToken //makes a GET request to the userInfoUrl endpoint, passing an object containing a header with the access token as an authorization bearer token.
		}
	})
		.then(response => response.json()) //Converts response from json to js object
		.then(data => {
			let userInfoDiv = document.getElementById('userLoggedInMessage');
			userInfoDiv.innerHTML = 'Logged in as ' + data.display_name;
			localStorage.setItem("userInfo" , data); //stores data object in local storage as 'userInfo' so it can be accessed on other pages
		});
}

function getTopItems(type, limit, time_range, functionToCall) {

	fetch((topItemsUrl + type + '?limit=' + limit + '&time_range=' + time_range), {
		headers: {
			'Authorization': 'Bearer ' + accessToken //makes a GET request to the topItemsURL endpoint with the type (artists or songs), and queries (limit) and (time_range), passing an object containing a header with the access token as an authorization bearer token.
		}
	})
		.then(response => response.json()) //Converts response from json to js object
		.then(data => {
			let items = data.items;
			functionToCall(items, data, type, limit, time_range);
		});
}

function getTrackAudioFeatures(trackId, functionToCall) {
	//console.log(trackId);
	fetch((baseUrl + '/audio-features/' + trackId), {
		headers: {
            'Authorization': 'Bearer ' + accessToken //makes a GET request to the trackAudioFeaturesURL endpoint, passing an object containing a header with the access token as an authorization bearer token.
        }
	})
		.then(response => response.json()) //Converts response from json to js object
		.then(data => {
			functionToCall(data);
		});
}

function getTrackRecommendations(seedTracks, seedArtists, seedGenres, functionToCall) {

}

function sortArrayAscending(array) { //bubble sort
	
	n = array.length;

	//loop through array (n) times
	for (let i = 0; i < n; i++) {
		
		//loop through array (n - i - 1) times since last i elements are already in place
		for (let j = 0; j < (n - i - 1); j++) {	
			
			// if current element greater than next element, swap them
			if (array[j] > array[j + 1]) {	
				let temp = array[j];	
				array[j] = array[j + 1];
				array[j + 1] = temp;
			}
        }
	}

	return array;
}
			
