"use strict";
const SEARCH_FORM = document.querySelector('.js-search-form');
const RESULTS_CONTAINER = document.querySelector('.js-results-list');
const SELECTED_SETLIST_CONTAINER = document.querySelector('.js-selected-setlist-container');
const SELECTED_ARTIST = document.querySelector('.js-selected-artist');
const SELECTED_PLACE = document.querySelector('.js-selected-place');
const SELECTED_DATE = document.querySelector('.js-selected-date');
const SELECTED_SETLIST = document.querySelector('.js-selected-setlist');
const handleSearch = () => {
    SEARCH_FORM?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchValue = SEARCH_FORM?.querySelector('input')?.value;
        if (searchValue) {
            try {
                const artistData = await getData('/get-artists', searchValue);
                populateArtists(artistData);
            }
            catch (error) {
                console.error('Error fetching artist data:', error);
            }
        }
    });
};
const getData = async (url, value) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value }),
        });
        if (!response.ok) {
            throw new Error('Response was not ok');
        }
        return await response.json();
    }
    catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};
const createButton = (container, text, classes, attributes) => {
    const BUTTON = document.createElement('button');
    BUTTON.textContent = text;
    BUTTON.className = classes;
    for (const [key, value] of Object.entries(attributes)) {
        BUTTON.setAttribute(key, value);
    }
    container.append(BUTTON);
};
const populateArtists = (artistData) => {
    SEARCH_FORM?.classList.add('hidden');
    if (RESULTS_CONTAINER && artistData.artist) {
        RESULTS_CONTAINER.innerHTML = '';
        for (const artist of artistData.artist) {
            createButton(RESULTS_CONTAINER, artist.name, 'js-artist-result text-left lg:hover:text-gray-400 transition-colors', {
                'data-mbid': artist.mbid,
            });
        }
        RESULTS_CONTAINER.classList.remove('hidden');
        RESULTS_CONTAINER.classList.add('flex');
        addArtistListeners();
    }
};
const addArtistListeners = () => {
    const BUTTONS = RESULTS_CONTAINER?.querySelectorAll('.js-artist-result');
    if (!BUTTONS)
        return;
    for (const BUTTON of BUTTONS) {
        BUTTON.addEventListener('click', async (e) => {
            const mbid = BUTTON.getAttribute('data-mbid');
            if (mbid) {
                try {
                    const setlistsData = await getData('/get-setlists', mbid);
                    if (setlistsData.setlist.length > 0) {
                        populateSetlists(setlistsData.setlist);
                    }
                }
                catch (error) {
                    console.error('Error fetching gigs:', error);
                }
            }
        });
    }
};
const populateSetlists = (setlistsData) => {
    if (!RESULTS_CONTAINER)
        return;
    RESULTS_CONTAINER.innerHTML = '';
    for (const setlist of setlistsData) {
        const buttonText = `${setlist.venue.name}, ${setlist.venue.city.name}, ${setlist.venue.city.state} ${setlist.eventDate.replace(/-/g, ' ')}`;
        createButton(RESULTS_CONTAINER, buttonText, 'js-setlist-result text-left text-2xl cursor-pointer lg:hover:text-gray-400 transition-colors', {
            'data-id': setlist.id,
        });
    }
    addSetlistListeners(setlistsData);
};
const addSetlistListeners = (setlistsData) => {
    const BUTTONS = RESULTS_CONTAINER?.querySelectorAll('.js-setlist-result');
    if (!BUTTONS)
        return;
    for (const BUTTON of BUTTONS) {
        const data = getMatchedData(BUTTON, setlistsData);
        const songs = data?.sets?.set[0]?.song;
        if (!songs || songs.length === 0) {
            BUTTON.disabled = true;
            BUTTON.classList.add('text-gray-600');
            BUTTON.classList.remove('cursor-pointer', 'lg:hover:text-gray-400');
            continue;
        }
        BUTTON.addEventListener('click', () => {
            loadSelectedSetlist(data);
        });
    }
};
const getMatchedData = (button, setlistsData) => {
    return setlistsData.find((setlist) => setlist.id === button.dataset.id);
};
const loadSelectedSetlist = (data) => {
    if (!data)
        return;
    if (SELECTED_ARTIST)
        SELECTED_ARTIST.innerHTML = data.artist.name;
    if (SELECTED_PLACE)
        SELECTED_PLACE.innerHTML = `${data.venue.name}, ${data.venue.city.name}, ${data.venue.city.state}`;
    if (SELECTED_DATE)
        SELECTED_DATE.innerHTML = data.eventDate.replace(/-/g, ' ');
    if (SELECTED_SETLIST) {
        SELECTED_SETLIST.innerHTML = '';
        for (const song of data.sets.set[0].song) {
            const songText = song.cover ? `${song.name} (Cover)` : song.name;
            createButton(SELECTED_SETLIST, songText, '', {});
        }
    }
    const CREATE_FORM = document.querySelector('.js-create-playlist-form');
    const CREATE_FORM_INPUT = CREATE_FORM?.querySelector('input');
    if (CREATE_FORM_INPUT)
        CREATE_FORM_INPUT.value = data.id;
    SELECTED_SETLIST_CONTAINER?.classList.remove('hidden');
    CREATE_FORM?.classList.remove('hidden');
    CREATE_FORM?.classList.add('flex');
    RESULTS_CONTAINER?.classList.add('hidden');
};
const init = () => {
    handleSearch();
};
init();
