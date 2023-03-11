class Track {
    constructor(track, features, similarityScore = null) {
		this.name = track.name;
		this.id = track.id;
        this.artists = track.artists; 
        this.album = track.album;

		this.features = {
            acousticness: features.acousticness,
            danceability: features.danceability,
            energy: features.energy,
            instrumentalness: features.instrumentalness,
            loudness: (features.loudness + 60) / 60, //normalize loudness to be between 0 and 1
            valence: features.valence,
        }

        this.similarityScore = similarityScore;
    }
    
    //takes in array of track objects and returns array of Track objects with audio features 
    static async createTracks(tracks) {
        const tracksAudioFeatures = await getTracksAudioFeatures(tracks);
        const trackObjects = [];
        // Creates a Track object for each track
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const features = tracksAudioFeatures[i];
            const trackObject = new Track(track, features);
            trackObjects.push(trackObject);
        }
        return trackObjects;
    }
}


class UserTopTracks {    
    static tracks = [];
    static averageTrackFeatures = {};

    static async generate() {
        await this.getTopTracks();
        await this.getAverageTrackFeatures();
    }

    static async getTopTracks() {
        const topTracks = [];

        let longTermTracks = await getTopItems("tracks", 40, "long_term");
        let mediumTermTracks = await getTopItems("tracks", 40, "medium_term");
        let shortTermTracks = await getTopItems("tracks", 10, "short_term");

        // Combine the tracks from the three API calls into a single array with no duplicates
        const allTracks = [...longTermTracks.items, ...mediumTermTracks.items, ...shortTermTracks.items];
        allTracks.forEach(track => {
            if (!topTracks.find(t => t.id === track.id)) {
                topTracks.push(track);
            }
        });

        this.tracks = await Track.createTracks(topTracks);
    }

    //calculates average feature value object for all of user's top tracks. put the getUsersTopTracksAverageFeatureVector, calculateAverageFeatureValue, and removeOutliers functions here as methods
    static async getAverageTrackFeatures() {
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

    //calculates average feature value from array of feature vectors
    static async calculateAverageFeature(featureValues) {
        featureValues = mergeSort(featureValues);
        featureValues = this.removeOutliers(featureValues);
        let total = 0;
        featureValues.forEach(value => {
            total += value;
        });    
        let average = total / featureValues.length;    
        return average;
    }

    //removes outliers from array 
    static removeOutliers(array) { 
        let firstQuartile = array[Math.floor(array.length / 4)];
        let thirdQuartile = array[Math.floor(3 * array.length / 4)];
        let interquartileRange = thirdQuartile - firstQuartile;
        
        let lowerBound = firstQuartile - (1.5 * interquartileRange);
        let upperBound = thirdQuartile + (1.5 * interquartileRange);

        for (let i = 0; i < array.length; i++) {
            if (array[i] < lowerBound || array[i] > upperBound) {
                array.splice(i, 1); //remove outlier and shifts all elements after it to the left
                i--; //decrements i to account for the shift           
            }
        }
        return array;
    }
}

class RecommendedTracks {
    constructor() {
        this.tracks = [];
    }

    async generate() {
        let recommendedTracks = await this.getSimilarTracks();
        recommendedTracks = this.calculateSimilarityScore(recommendedTracks);
        console.log(recommendedTracks);
        recommendedTracks = mergeSort(recommendedTracks, 'similarityScore');
        recommendedTracks = recommendedTracks.reverse();
        this.tracks = recommendedTracks;
    }

    //returns array of track objects with similar tracks to each track in userTopTracksArray
    async getSimilarTracks() {
        const similarTracksArray = [];
        for (let topTrack of UserTopTracks.tracks) {
            let similarTracks = await getTrackRecommendations(topTrack);
            for (let track of similarTracks) {
                //only add track to similarTracksArray if it is not already in userTopTracksArray or similarTracksArray
                if (!similarTracksArray.find(t => t.id === track.id) && !UserTopTracks.tracks.find(t => t.id === track.id)) { 
                    similarTracksArray.push(track);
                }
            }
        }

        const recommendedTracks = await Track.createTracks(similarTracksArray);
        return recommendedTracks;
    } 

    //returns tracks array with similarity score attribute added to each track object based on similarity to userAverageFeatures
    calculateSimilarityScore(tracks) {
        const userMagnitude = this.calculateMagnitude(UserTopTracks.averageTrackFeatures);
        for (let track of tracks) {
            const trackMagnitude = this.calculateMagnitude(track);
            const dotProduct = this.calculateDotProduct(track);
            const similarityScore = this.calculateCosineSimilarity(dotProduct, userMagnitude, trackMagnitude);
            track.similarityScore = similarityScore;
        }
        return tracks;
    }

    // returns dot products of the features in two track objects
    calculateDotProduct(track) {
        let dotProduct = 0;
        for (let feature in track.features) {
            dotProduct += UserTopTracks.averageTrackFeatures.features[feature] * track.features[feature];
        }
        return dotProduct;
    }

    //takes in track object and returns magnitude of feature vector
    calculateMagnitude(track) {
        let magnitude = 0;
        for (let feature in track.features) {
            magnitude += Math.pow(track.features[feature], 2);
        }
        magnitude = Math.sqrt(magnitude);
        return magnitude;
    }

    //calculates cosine similarity score and returns value between 0 and 1
    calculateCosineSimilarity(dotProduct, userMagnitude, trackMagnitude) {
        const similarityScore = (dotProduct) / (userMagnitude * trackMagnitude);
        return similarityScore.toFixed(2); //round to 2 decimal places
    }


}

async function recommendTracks() {
    const recommendationsInfo = document.getElementById('recommendationsInfo');
    recommendationsInfo.innerHTML = 'Loading...';

    //generates the tracks and averageTrackFeatures attributes of userTopTracks
    await UserTopTracks.generate(); 
    console.log("generated user top tracks");

    const recommendedTracks = new RecommendedTracks();
    await recommendedTracks.generate();
    console.log("generated recommended tracks");

    recommendedTracks.tracks = recommendedTracks.tracks.slice(0, 150); //only keep top 150 tracks
    displayRecommendations(recommendedTracks.tracks);
}  