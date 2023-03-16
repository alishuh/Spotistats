
// validates the options selected by the user, if they are valid, the top items are displayed
function validateOptions() {
    const preferredType = document.querySelector('input[name="type"]:checked');
    const preferredTime = document.querySelector('input[name="time"]:checked');
    const preferredQuantity = document.getElementById('numberOfItems').value;
    const errorMessage = document.getElementById('inputError');

    if ((!preferredType) || (!preferredTime) || (!preferredQuantity)) {
        errorMessage.innerHTML = 'Please select all options before submitting!';
    } else if ((preferredQuantity < 1) || (preferredQuantity > 50) || (isNaN(preferredQuantity))) {
        errorMessage.innerHTML = 'The Number of Results must be a number between 1-50';
    } else {
        inputError.innerHTML = '';
        displayTopItems(preferredType.id, preferredQuantity, preferredTime.id);
    }
}



// represents a single item in the top items table
class TopItem {
    constructor(item, index) {
        this.rank = index + 1;
        this.name = item.name;
        this.popularity = item.popularity;
    }
    
    //converts an array of attributes to a comma separated string to be displayed in the table
    convertToList(attributeArray) {
        let list = '';
        for (let item of attributeArray) {
            if (item === attributeArray[attributeArray.length - 1]) {
                list += item;
            } else {
                list += item + ', ';
            }
        }
        return list;
    }
}

// represents a single track in the top items table
class TopTrack extends TopItem {
    constructor(track, index) {
        super(track, index);
        this.artists = this.convertToList(track.artists.map(artist => artist.name));
        this.album = track.album.name;
    }
}

// represents a single artist in the top items table
class TopArtist extends TopItem {
    constructor(artist, index) {
        super(artist, index);
        this.genres = this.convertToList(artist.genres);
        this.followers = artist.followers.total;
    }
}



// represents a table of top items requested by the user
class TopItemsTable {
    constructor(items) {
        this.items = items;
        this.headers = [];
    }

    // displays the table by clearing the old table and displaying the headers and items
    displayTable() {
        const table = document.getElementById('topItemsTable');
        table.innerHTML = ''; //clears the table
        this.displayTableHeader(table);
        this.displayTableItems(table);
    }

    // displays the table headers and adds event listeners to each header to sort the table by the attribute of the header
    displayTableHeader(table) {
        let headerRow = document.createElement('tr');
        for (let header of this.headers) {
            const headerCell = document.createElement('th');
            headerCell.innerHTML = header;
            headerCell.addEventListener('click', () => this.sortTableByAttribute(header.toLowerCase()));
            headerRow.appendChild(headerCell);
        }
        table.appendChild(headerRow);
    }
    
    // displays the items in the table as rows
    displayTableItems(table, items = this.items) {
        for (let item of items) {
            const itemRow = document.createElement('tr');
            itemRow.className = 'itemItems';
            for (let header of this.headers) {
                const itemCell = document.createElement('td');
                itemCell.innerHTML = item[header.toLowerCase()];
                itemRow.appendChild(itemCell);
            }
            table.appendChild(itemRow);
        }
    }

    // sorts the items in the table by the attribute of the header that was clicked and displays the sorted items
    sortTableByAttribute(attribute) {
        let sortedItems = mergeSort(this.items, attribute);
        if (attribute == 'popularity') {
            sortedItems.reverse();
        }
        //remove all current items from the table
        const tableItems = document.getElementsByClassName('itemItems');
        while (tableItems.length > 0) {
            tableItems[0].parentNode.removeChild(tableItems[0]); 
        }
        this.displayTableItems(document.getElementById('topItemsTable'), sortedItems);
    }
}

// represents a table of top tracks requested by the user
class TopTracksTable extends TopItemsTable {
    constructor(tracks) {
        super(tracks);
        this.headers = ['Rank', 'Name', 'Artists', 'Album', 'Popularity'];
    }
}

// represents a table of top artists requested by the user
class TopArtistsTable extends TopItemsTable {
    constructor(artists) {
        super(artists);
        this.headers = ['Rank', 'Name', 'Genres', 'Popularity'];
    }
}
        


/* displays the top items (tracks or artists) in a table
by calling the getTopItems function and creating a TopItemsTable object 
to display the items */
async function displayTopItems(type, limit, time_range) {
    let topItems = await getTopItems(type, limit, time_range);
    let table;
    updateTableTitle(type, limit, time_range)
    
    if (type === 'tracks') {
        topItems = topItems.map((track, index) => new TopTrack(track, index));
        table = new TopTracksTable(topItems);
    }
    else if (type === 'artists') {
        topItems = topItems.map((artist, index) => new TopArtist(artist, index));
        table = new TopArtistsTable(topItems);
    }

    table.displayTable();
}

function updateTableTitle(type, limit, time_range) {
    const tableTitle = document.getElementById('topItemsTitle');
    if (time_range == 'short_term') {
        tableTitle.innerHTML = `Your Top ${limit} ${type} (Last 4 Weeks)`;
    } else if (time_range == 'medium_term') {
        tableTitle.innerHTML = `Your Top ${limit} ${type} (Last 6 Months)`;
    } else if (time_range == 'long_term') {
        tableTitle.innerHTML = `Your Top ${limit} ${type} (All Time)`;
    }
}

