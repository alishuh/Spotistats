class Track {
    constructor(track, features, similarityScore = null) {
      this.name = track.name;
      this.id = track.id;

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
    //returns array of objects for user's top tracks
    let userTopTracks = await getUserTopTracks(); 
    console.log(userTopTracks.length);
    
    //returns average feature vector (TRACK OBJECT) for user's top tracks
    let userTopAverageFeaturesVector = await getUsersTopTracksAverageFeatureVector(userTopTracks); 
    console.log(userTopAverageFeaturesVector);

    // gets an array of TRACK OBJECTS of similar tracks to user's top tracks
    let recommendedTracks = await getSimilarTracksFeatureVectors(userTopTracks);

    // calculates similarity score for each track in similar tracks array and returns array of track objects with similarity score
    recommendedTracks = await calculateSimilarityScore(userTopAverageFeaturesVector, recommendedTracks);
    console.table(recommendedTracks);
    //sort the array of track objects by similarity score
    //display the top ones
   
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
      let averageFeatureValue = await calculateAverageFeature(featureVectors); 
      topTracksAverageFeatureVector[feature] = averageFeatureValue; 
    };
    return topTracksAverageFeatureVector;
}

//calculates average feature value from array of feature vectors
async function calculateAverageFeature(totalVectors) { 
    totalVectors = mergeSort(totalVectors);
    totalVectors = removeOutliers(totalVectors);
    let sum = 0;
    totalVectors.forEach(vector => {
        sum += vector;
    });    
    let average = sum / totalVectors.length;    
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


/*takes in array of track objects
returns array of track objects with similar tracks to each track in array*/
async function getSimilarTracksFeatureVectors(userTopTracksArray) {
    const totalSimilarTracks = [];
    for (let topTrack of userTopTracksArray) {
        let similarTracks = await getTrackRecommendations(topTrack);
        for (let track of similarTracks) {
          if (!totalSimilarTracks.find(t => t.id === track.id) && !userTopTracksArray.find(t => t.id === track.id)) {  
            totalSimilarTracks.push(track);
          }
        }
    }
    const similarTracksFeatureVectors = await getTrackFeatureVector(totalSimilarTracks); 
    return similarTracksFeatureVectors;   
}

//calculates cosine similarity score for each track in array and returns array of track objects with similarity scores
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
        if (feature === 'name' || feature === 'id' || feature === 'similarityScore') {
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
        if (feature === 'name' || feature === 'id' || feature === 'similarityScore') {
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
        