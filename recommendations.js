class Track {
    constructor(track, features, similarityScore = null) {
		this.name = track.name;
		this.id = track.id;
        this.artists = track.artists; 
        this.album = track.album;

		this.acousticness = features.acousticness;
		this.danceability = features.danceability;
		this.energy = features.energy;
		this.instrumentalness = features.instrumentalness;
		this.loudness = (features.loudness + 60) / 60; // normalize loudness to be between 0 and 1 (like the other features)
		this.valence = features.valence;

		this.similarityScore = similarityScore;
    }    
}

async function recommendTracks() {

    const recommendationsInfo = document.getElementById('recommendationsInfo');
    recommendationsInfo.innerHTML = 'Loading...';

    let userTopTracks = await getUserTopTracks(); 
    console.log("got user's top tracks");

    let userTopAverageFeaturesVector = await getUsersTopTracksAverageFeatureVector(userTopTracks);
    console.log("got user's top tracks average feature vector");

    let recommendedTracks = await getSimilarTracksFeatureVectors(userTopTracks); //takes the longest to run
    console.log("got recommended tracks feature vectors");

    recommendedTracks = await calculateSimilarityScore(userTopAverageFeaturesVector, recommendedTracks);
    console.log("calculated similarity score for recommended tracks");

    recommendedTracks = mergeSort(recommendedTracks, "similarityScore"); //sorts tracks by similarity score
    recommendedTracks = recommendedTracks.reverse();
    recommendedTracks = recommendedTracks.slice(0, 150); //only keep top 150 tracks

    displayRecommendations(recommendedTracks);
}



// gets user's top tracks from all time, last 6 months, and last 4 weeks
async function getUserTopTracks() {
    let allTracks = [];
    let longTermTracks = await getTopItems("tracks", 40, "long_term"); 
    let mediumTermTracks = await getTopItems("tracks", 40, "medium_term");
    let shortTermTracks = await getTopItems("tracks", 10, "short_term");

    // Combine the tracks from the three API calls into a single array with no duplicates
    [longTermTracks, mediumTermTracks, shortTermTracks].forEach(tracks => {
		tracks.items.forEach(track => {
			if (!allTracks.find(t => t.id === track.id)) {
				allTracks.push(track);
			}
		});
    });
    return allTracks; 
}



// gets average feature vector for all of user's top tracks 
async function getUsersTopTracksAverageFeatureVector(userTopTracks) { 
    const listOfTrackFeatures = ['acousticness', 'danceability', 'energy', 'instrumentalness', 'loudness', 'valence'];
    let topTrackFeatureVectors = await getTrackFeatureVector(userTopTracks); 
    let topTracksAverageFeatureVector = new Track({name: 'userTopTracks', id: 'userTopTracks'}, {}); 
    
    for (let feature of listOfTrackFeatures) { //for each feature, get all feature values for each track and calculate average
    	let featureVectors = [];
		for (let track of topTrackFeatureVectors) { 
			featureVectors.push(track[feature]);   
		};
		let averageFeatureValue = await calculateAverageFeatureValue(featureVectors); 
		topTracksAverageFeatureVector[feature] = averageFeatureValue; 
    };
    return topTracksAverageFeatureVector;
}

//calculates average feature value from array of feature vectors
async function calculateAverageFeatureValue(totalVectorsArray) { 
    totalVectorsArray = mergeSort(totalVectorsArray);
    totalVectorsArray = removeOutliers(totalVectorsArray);
    let total = 0;
    totalVectorsArray.forEach(vector => {
        total += vector;
    });    
    let average = total / totalVectorsArray.length;    
    return average;
}

//removes outliers from array 
function removeOutliers(array) { 
    let q1 = array[Math.floor(array.length / 4)];
    let q3 = array[Math.floor(3 * array.length / 4)];
    let iqr = q3 - q1;
    
    let lowerBound = q1 - (1.5 * iqr);
    let upperBound = q3 + (1.5 * iqr);

    for (let i = 0; i < array.length; i++) {
        if (array[i] < lowerBound || array[i] > upperBound) {
            array.splice(i, 1); //remove outlier and shifts all elements after it to the left
            i--; //decrements i to account for the shift           
        }
    }
    return array;
}


//takes in array of track objects and returns array of Track objects with audio features 
async function getTrackFeatureVector(tracks) {
	const tracksAudioFeatures = await getTracksAudioFeatures(tracks); 
	// Creates a Track object for each track
	const tracksFeatureVectors = tracksAudioFeatures.map((feature, index) => {
		const track = tracks[index];
		return new Track(track, feature);
	});
	return tracksFeatureVectors; 
}


//returns array of track objects with similar tracks to each track in userTopTracksArray
async function getSimilarTracksFeatureVectors(userTopTracksArray) {
    const similarTracksArray = [];
    for (let topTrack of userTopTracksArray) {
        let similarTracks = await getTrackRecommendations(topTrack);
        for (let track of similarTracks) {
            //only add track to similarTracksArray if it is not already in userTopTracksArray or similarTracksArray
            if (!similarTracksArray.find(t => t.id === track.id) && !userTopTracksArray.find(t => t.id === track.id)) { 
                similarTracksArray.push(track);
            }
        }
    }
    const similarTracksFeatureVectors = await getTrackFeatureVector(similarTracksArray); 
    return similarTracksFeatureVectors;   
}



//returns tracks array with similarity score attribute added to each track object based on similarity to userAverageFeatures
function calculateSimilarityScore(userAverageFeatures, tracks) {
    const userMagnitude = calculateMagnitude(userAverageFeatures);
    for (let track of tracks) {
        const trackMagnitude = calculateMagnitude(track);
        const dotProduct = calculateDotProduct(userAverageFeatures, track);
        const similarityScore = calculateCosineSimilarity(dotProduct, userMagnitude, trackMagnitude);
        track.similarityScore = similarityScore;
    }
    return tracks;
}

// returns dot products of the features in two track objects
function calculateDotProduct(userAverageFeatures, track) {
    let dotProduct = 0;
    for (feature in track) {
        if (feature === 'name' || feature === 'id' || feature === 'similarityScore' || feature === 'artists' || feature === 'album') {
            continue; 
        }
        dotProduct += userAverageFeatures[feature] * track[feature];
    }
    return dotProduct;
}

//takes in track object and returns magnitude of feature vector
function calculateMagnitude(track) {
    let magnitude = 0;
    for (feature in track) {
        if (feature === 'name' || feature === 'id' || feature === 'similarityScore' || feature === 'artists' || feature === 'album') {
            continue; 
        }
        magnitude += Math.pow(track[feature], 2);
    }
    magnitude = Math.sqrt(magnitude);
    return magnitude;
}

//calculates cosine similarity score and returns value between 0 and 1
function calculateCosineSimilarity(dotProduct, userMagnitude, trackMagnitude) {
    const similarityScore = (dotProduct) / (userMagnitude * trackMagnitude);
    return similarityScore.toFixed(2); //round to 2 decimal places
}
        