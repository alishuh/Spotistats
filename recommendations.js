/* track object that holds track name, id, artists, album, audio features, and similarity score (if applicable)
also has a static method to create an array of Track objects containing audio features from an array of tracks returned from the Spotify API */
class Track {
    constructor(track, features, similarityScore = null) {
		this.name = track.name;
		this.id = track.id;
        this.artists = track.artists; 
        this.album = track.album;

        //all audio features between 0 and 1 (if not, normalize to be between 0 and 1)
		this.features = {
            acousticness: features.acousticness,
            danceability: features.danceability,
            energy: features.energy,
            instrumentalness: features.instrumentalness,
            loudness: (features.loudness + 60) / 60,
            valence: features.valence,
        }

        //similarity score is a number between 0 and 1 that represents how similar the track is to the user's top tracks
        this.similarityScore = similarityScore;
    }
    
    //takes in array of track objects and returns array of Track objects with audio features 
    static async createTracks(tracks) {
        const tracksAudioFeatures = await getTracksAudioFeatures(tracks);
        return tracks.map((track, index) => new Track(track, tracksAudioFeatures[index]));
    }
}



/* class to hold user's top tracks and calculate average track features for those tracks.
by default, the top tracks are the user's top 40 tracks from the last 6 months,
40 tracks from the last 4 weeks, and 10 tracks from the last 4 weeks */
class UserTopTracks {
    
    /*constructor initializes empty array of tracks and average track features 
    (a Track object where the features are the average feature values for all of the user's top tracks)*/
    constructor() {
        this.tracks = [];
        this.averageTrackFeatures = null;
    }

    async generate() {
        await this.getTopTracks();
        await this.getAverageTrackFeatures();
    }

    /*gets user's top tracks from the last 6 months, last 4 weeks, and last 4 weeks and combines them into one array
    then removes any duplicate tracks and creates Track objects for each track */
    async getTopTracks() {
        const longTermTracks = await getTopItems("tracks", 40, "long_term");
        const mediumTermTracks = await getTopItems("tracks", 40, "medium_term");
        const shortTermTracks = await getTopItems("tracks", 10, "short_term");

        const allTracks = [...longTermTracks, ...mediumTermTracks, ...shortTermTracks];
        const topTracks = allTracks.filter((track, index) => {
            return allTracks.findIndex(t => t.id === track.id) === index;
        });

        this.tracks = await Track.createTracks(topTracks);
    } 

    // calculates mean of each audio feature for all tracks in user's top tracks and creates Track object with those features
    async getAverageTrackFeatures() {
        const listOfTrackFeatures = ['acousticness', 'danceability', 'energy', 'instrumentalness', 'loudness', 'valence'];
        let averageTrackFeatures = new Track({name: 'userTopTracks', id: 'userTopTracks'}, {});

        for (let feature of listOfTrackFeatures) { //for each feature, get all feature values for each track and calculate average
            let featureValues = [];
            for (let track of this.tracks) {
                featureValues.push(track.features[feature]);
            };
            let averageFeatureValue = await this.calculateAverageFeature(featureValues);
            averageTrackFeatures.features[feature] = averageFeatureValue;
        };

        this.averageTrackFeatures = averageTrackFeatures;
    }

    async calculateAverageFeature(featureValues) {
        featureValues = mergeSort(featureValues);
        featureValues = this.removeOutliers(featureValues);
        let total = 0;
        featureValues.forEach(value => {
            total += value;
        });    
        let average = total / featureValues.length;    
        return average;
    }

    // Removes outliers from array of feature values
    removeOutliers(featureArray) { 
        // quartiles and interquartile range are used to calculate lower and upper bounds for outliers
        let firstQuartile = featureArray[Math.floor(featureArray.length / 4)];
        let thirdQuartile = featureArray[Math.floor(3 * featureArray.length / 4)];
        let interquartileRange = thirdQuartile - firstQuartile;
        
        // Any values outside of lowerBound and upperBound are considered outliers
        let lowerBound = firstQuartile - (1.5 * interquartileRange);
        let upperBound = thirdQuartile + (1.5 * interquartileRange);

        // Remove any outliers from featureArray
        for (let i = 0; i < featureArray.length; i++) {
            if (featureArray[i] < lowerBound || featureArray[i] > upperBound) {
                featureArray.splice(i, 1);
                // Decrement i so that the next element in the array is not skipped
                i--;   
            }
        }
        return featureArray;
    }
}



/* class that generates recommended tracks based on user's top tracks.
also calculates similarity score for each track based on cosine similarity to user's top tracks*/
class RecommendedTracks {
    constructor(userTopTracks) {
        this.tracks = [];

        this.userTopTracks = userTopTracks.tracks;
        this.userAverageFeatures = userTopTracks.averageTrackFeatures;
    }

    /* generates recommended tracks based on user's top tracks,
    calculates similarity score for each track and sorts tracks by similarity score (descending)
    then sets this.tracks to the sorted array of recommended tracks */
    async generate() {
        let recommendedTracks = await this.getSimilarTracks();
        recommendedTracks = this.calculateSimilarityScore(recommendedTracks);
        recommendedTracks = mergeSort(recommendedTracks, 'similarityScore');
        recommendedTracks = recommendedTracks.reverse();
        this.tracks = recommendedTracks;
    }

    // Returns array of recommended track objects based on user's top tracks from Spotify's 'Get Recommendations' endpoint
    async getSimilarTracks() {
        const similarTracksArray = [];
        for (let topTrack of this.userTopTracks) {
            let similarTracks = await getTrackRecommendations(topTrack);
            for (let track of similarTracks) {
                //only add track to similarTracksArray if it is not already in userTopTracksArray or similarTracksArray
                if (!similarTracksArray.find(t => t.id === track.id) && !this.userTopTracks.find(t => t.id === track.id)) { 
                    similarTracksArray.push(track);
                }
            }
        }

        const recommendedTracks = await Track.createTracks(similarTracksArray);
        return recommendedTracks;
    } 

    /* Takes in array of recommended tracks and calculates cosine similarity score for each track based on user's top tracks
    returns array of recommended tracks with similarity score added to each track object 
    cosine similarity score is calculated using the formula:
    similarityScore = (userAverageFeatures . trackFeatures) / (|userAverageFeatures| * |trackFeatures|) */
    calculateSimilarityScore(tracks) {
        const userMagnitude = this.calculateMagnitude(this.userAverageFeatures);
        for (let track of tracks) {
            const trackMagnitude = this.calculateMagnitude(track);
            const dotProduct = this.calculateDotProduct(track);
            const similarityScore = this.calculateCosineSimilarity(dotProduct, userMagnitude, trackMagnitude);
            track.similarityScore = similarityScore;
        }
        return tracks;
    }

    // Calculates dot product of user's average features and another track's features
    calculateDotProduct(track) {
        let dotProduct = 0;
        for (let feature in track.features) {
            dotProduct += this.userAverageFeatures.features[feature] * track.features[feature];
        }
        return dotProduct;
    }

    // Calculates the magnitude of a track's features (square root of sum of squares of each feature)
    calculateMagnitude(track) {
        let magnitude = 0;
        for (let feature in track.features) {
            magnitude += Math.pow(track.features[feature], 2);
        }
        magnitude = Math.sqrt(magnitude);
        return magnitude;
    }

    //calculates cosine similarity score between user's top tracks and another track, returns similarity score between 0 and 1
    calculateCosineSimilarity(dotProduct, userMagnitude, trackMagnitude) {
        const similarityScore = (dotProduct) / (userMagnitude * trackMagnitude);
        return similarityScore.toFixed(2); //round to 2 decimal places
    }
}



// class that takes in an array of recommended tracks and displays them on the page
class displayRecommendations {
    constructor(recommendedTracks) {
        this.recommendedTracks = recommendedTracks;
        this.recommendationsInfo = document.getElementById('recommendationsInfo');
        this.recommendationsContainer = document.getElementById('recommendations');
        this.recommendationsSection = document.getElementById('recommendationsSection');
    }

    /* hides recommendationsInfo and displays recommendationsContainer
    then displays each recommended track by calling displayTrack() for each track */
    display() {
        this.recommendationsInfo.style.display = 'none';
        this.recommendationsContainer.style.display = 'block';
        
        for (let i = 0; i < this.recommendedTracks.length; i++) {
            let trackDiv = this.displayTrack(this.recommendedTracks[i]);
            this.recommendationsSection.appendChild(trackDiv);
        }
    }

    // displays a single track (name, artists, similarity score, album image)
    displayTrack(track) {
        let trackDiv = document.createElement('div');
        let trackText = document.createElement('div');
        trackDiv.className = 'track';
        trackText.className = 'trackText';

        trackText.innerHTML = `<h4>${track.name}</h4>`;
        trackText.innerHTML += `<p>${track.artists.map(artist => artist.name).join(", ")}</p>`;
        trackText.innerHTML += `<p><b>${track.similarityScore * 100}% Recommended</b></p>`;
        trackDiv.appendChild(trackText);

        let albumImage = document.createElement("img");
        albumImage.src = track.album.images[0].url;
        trackDiv.appendChild(albumImage);

        return trackDiv;
    }
}



/* function that is called when the user clicks the "Get Recommendations" button
calls all other functions to generate and display recommendations */
async function recommendTracks() {
    const recommendationsInfo = document.getElementById('recommendationsInfo');
    recommendationsInfo.innerHTML = 'Loading...';

    //generates the tracks and averageTrackFeatures attributes of userTopTracks
    const userTopTracks = new UserTopTracks();
    await userTopTracks.generate();

    const recommendedTracks = new RecommendedTracks(userTopTracks);
    await recommendedTracks.generate();

    recommendedTracks.tracks = recommendedTracks.tracks.slice(0, 150); //only keep top 150 tracks

    const displayTrackRecommendations = new displayRecommendations(recommendedTracks.tracks);
    displayTrackRecommendations.display();
}