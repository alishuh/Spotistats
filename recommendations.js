class Track {
    constructor(track, features) {
      if (!track) {
        alert('Track parameter is undefined');
      }
      this.name = track.name;
      this.id = track.id;
      this.acousticness = features.acousticness;
      this.danceability = features.danceability;
      this.energy = features.energy;
      this.instrumentalness = features.instrumentalness;
      this.loudness = features.loudness;
      this.tempo = features.tempo;
      this.valence = features.valence;
    }    
}


async function recommendTracks() {
    
    let userTopTracks = await getUserTopTracks(); //returns array of tracks (no repeats)
    console.log(userTopTracks);
    
    // gets a single average feature vector for all of user's top tracks
    let userTopFeaturesVector = await getUsersTopTracksAverageFeatureVector(userTopTracks); 
    //console.log(userTopFeaturesVector);

    getSimilarTracksFeatureVectors();

    calculateSimilarityScore();
   
}

async function getUserTopTracks() { 
  let allTracks = [];
  let completedRequests = 0;

  return new Promise((resolve) => {
    getTopItems("tracks", 50, "long_term", addToArray);
    getTopItems("tracks", 50, "medium_term", addToArray); 
    getTopItems("tracks", 10, "short_term", addToArray);

    function addToArray(topTracks) {
      topTracks.forEach((topTrack) => {
        if (!allTracks.find((track) => track.id === topTrack.id)) {
          allTracks.push(topTrack);
        }
      });

      console.log(`Number of tracks added: ${allTracks.length}`);
      completedRequests++;
      if (completedRequests == 3) {
        resolve(allTracks);
      }
    }
  });
}

async function getUsersTopTracksAverageFeatureVector(userTopTracks) { 
    const listOfTrackFeatures = ['acousticness', 'danceability', 'energy', 'instrumentalness', 'loudness', 'tempo', 'valence'];
    console.log(userTopTracks.length);
    console.log(userTopTracks);
    
    let topTrackFeatureVectors = await getTrackFeatureVector(userTopTracks); // returns feature vector for each track in userTopTracks as an array of objects
    //console.log(topTrackFeatureVectors);

    let topTracksAverageFeatureVector = new Track({name: 'userTopTracks', id: 'userTopTracks'}, {}); //creates new Track object to store average feature values for all user's top tracks

    listOfTrackFeatures.forEach(feature => { //loops through each feature. calculates avg feature value for each feature and sets it as property for topTracksAverageFeatureVector
        let featureVectors = [];
        
        topTrackFeatureVectors.forEach(track => { 
            console.log(track.name);
            featureVectors.push(track[feature]); //pushes current feature value for each track into featureVectors array      
        });

        let averageFeatureValue = calculateAverageFeature(featureVectors); //calculates average feature value for this specific feature
        
        topTracksAverageFeatureVector[feature] = averageFeatureValue; //sets feature property for topTracksAverageFeatureValue to average feature value
        
    }); 

    return topTracksAverageFeatureVector;

}

function calculateAverageFeature(totalVectors) { //calculate average feature value by removing outliers and taking average of remaining values
    totalVectors = sortArrayAscending(totalVectors);

    //find outliers and remove them
    totalVectors = removeOutliers(totalVectors);

    //calculate average
    let sum = 0;
    totalVectors.forEach(vector => {
        sum += vector;
    });
    let average = sum / totalVectors.length;
    return average;
}

function removeOutliers(array) { //removes outliers using interquartile range
    let n = array.length;
    let q1 = array[Math.floor(n / 4)];
    let q3 = array[Math.floor(3 * n / 4)];
    let iqr = q3 - q1;
    
    let lowerBound = q1 - (1.5 * iqr);
    let upperBound = q3 + (1.5 * iqr);

    for (let i = 0; i < array.length; i++) {
        if (array[i] < lowerBound || array[i] > upperBound) {
            console.log(array[i]);
            array.splice(i, 1); //remove outlier and shifts all elements after it to the left
            i--; //decrements i to account for the shift           
        }
    }

    return array;
}

async function getTrackFeatureVector(tracks) {
  let featureVectors = [];
  console.log(tracks); 

  tracks.forEach((track) => {
    getTrackAudioFeatures(track.id, convertToObject)
    
    function convertToObject(features) {
      const trackObject = new Track(track, features);
      featureVectors.push(trackObject);
    }

  });

  return featureVectors;
}



function getSimilarTracksFeatureVectors() {
    
}

function calculateSimilarityScore() {
    
}
        