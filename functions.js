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

function getTopItems(type, limit, time_range) {
	return new Promise((resolve, reject) => { //returns a promise that resolves to the data object returned from the API call
	  fetch((topItemsUrl + type + '?limit=' + limit + '&time_range=' + time_range), {
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

function getTrackRecommendations(track) {
	return new Promise((resolve) => {
		seedTracks = track.id;
		seedArtists = track.artists[0].id;

		fetch((baseUrl + '/recommendations?seed_tracks=' + seedTracks + '&seed_artists=' + seedArtists + '&limit=10'), {
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
 
// recursive merge sort function to sort an array
function mergeSort(array) {
    if (array.length === 1) return array; 
    const middleIndex = Math.floor(array.length / 2);
    const leftHalf = array.slice(0, middleIndex);
    const rightHalf = array.slice(middleIndex);
    return merge(
        mergeSort(leftHalf),
        mergeSort(rightHalf)
    );
}

function merge(leftHalf, rightHalf) {
    const sortedArray = [];
    while (leftHalf.length && rightHalf.length) {
        if (leftHalf[0] <= rightHalf[0]) {
            sortedArray.push(leftHalf.shift());
        } else {
            sortedArray.push(rightHalf.shift());
        }
    }
    return [...sortedArray, ...leftHalf, ...rightHalf];
}



			
