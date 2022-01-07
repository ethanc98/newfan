const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const request = require('request');
const ejs = require('ejs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const querystring = require('query-string');


const scope = 'playlist-modify-private';


const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
const session = require('express-session');
app.use(session({secret: 'mySecret', resave: false, saveUninitialized: false}));

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
function randomStringGenerator() {
    return (Math.random() + 1).toString(36).substring(2);
}

let gig = ''
  


app.get('/', (req, res) => {
    res.render('index');

});

app.post('/search', async (req, res) => {
    const time = new Date().toTimeString().split(" ")[0];
    console.log(`api request (/search) ${time}`);
    try {
    // grabs artists 'mbid' key
    const artistKey = await fetch(`https://api.setlist.fm/rest/1.0/search/artists?artistName=${req.body.input}&p=1&sort=relevance`, {
            method: 'GET',
            headers: {
                'x-api-key' : 'wP7CY7Rok_VdYFR9jh9e15vKdurrWwMiTCM8',
                'Accept' : 'application/json',
            }
        });
        const data = await artistKey.json();

        artist = data;
        return res.render('artists', {
        arr: artist
    });
    } catch (e) {console.log(e)}

        // delay to accomodate 2-req p/s api limit
        await sleep(1000);
    });


app.post('/gigs', async (req, res) => {
    const time = new Date().toTimeString().split(" ")[0];
    console.log(`api request (/gigs) ${time}`);
    // uses 'mbid' to grab artists most recent setlist
        const setlists = await fetch(`https://api.setlist.fm/rest/1.0/artist/${req.body.artistMbid}/setlists?p=1`, {
            method: 'GET',
            headers: {
                'x-api-key' : 'wP7CY7Rok_VdYFR9jh9e15vKdurrWwMiTCM8',
                'Accept' : 'application/json',
            }
        });
        const fm = await setlists.json();
        // console.log(fm.setlist[0].sets.set[0].song);

        const stringified = JSON.stringify(fm);

        if  (stringified.includes('Too Many Requests')) {

            console.log(`${stringified} had too many requests`);
            return res.render('error');
        }
        gig = fm;
        return res.render('gigs', {
            arr: fm
        });
    
});



// app.get('/callback2', async (req, res) => {
//     // const setlistNum = req.session.setlistNum;


//     const code = req.query.code || null;
//     const state = req.query.state || null;
    
//     if (state === null) {
//       res.redirect('/#' +
//         querystring.stringify({
//           error: 'state_mismatch'
//         }));
//     } else {
//         const getToken = await fetch(`https://accounts.spotify.com/api/token`, {
//             method: 'POST',
//             headers: {
//                 'Authorization' : 'Basic ' + btoa(clientId + ':' + clientSecret),
//                 'Content-Type' : 'application/x-www-form-urlencoded'
//             },
//             body: new URLSearchParams({
//                 code: code,
//                 redirect_uri: redirect_uri,
//                 grant_type: 'authorization_code'
//             })
//         });   
//         const data = await getToken.json();
//         // console.log(data.access_token);
//         let track = 'Get Back';
//         let artist = 'The Beatles';

//         let string = "Ain't Your Right";
//         // string = string.replace("'","");
//             // const getTrackIds = await fetch(`https://api.spotify.com/v1/search?q=track%3A${gig.setlist[setlistNum].sets.set[0].song[i].name}+artist%3A${gig.setlist[setlistNum].artist.name}&type=track&limit=5`, {
//             // const getTrackIds = await fetch(`https://api.spotify.com/v1/search?q=track%3A${string}+artist%3ASky Ferreira&type=track&limit=5`, {
//             const getTrackIds = await fetch(`https://api.spotify.com/v1/search?q=artist%3A${artist}+track%3A${track}&type=track&limit=5`, {
//             // const getTrackIds = await fetch(`https://api.spotify.com/v1/search?q=artist%3AArctic Monkeys+track%3ADancing Shoes&type=track&limit=5`, {
//                         method: 'GET',
//                         headers: {
//                             'Authorization' : 'Bearer ' + data.access_token,
//                             'Content-Type' : 'application/json'
//                         },
//                         json: true
//                     });

//         const result = await getTrackIds.json();
//         return console.log(result.tracks);
//                 }
// });

app.get('/final', (req, res) => {
    res.send(req.body);

});

app.get('/setlist', (req, res) => {
    res.render('setlist');
});

app.get('/error', (req, res) => {
    res.render('error');
});


app.post('/spotify', (req, res) => {
    req.session.setlistNum = req.body.setlistNum;
    res.redirect('/spotify')
})

app.get('/spotify', (req, res) => {
        const state = randomStringGenerator();
    
        res.redirect('https://accounts.spotify.com/authorize?' +
            querystring.stringify({
                response_type: 'code',
                show_dialog: true,
                client_id: process.env.clientId,
                scope: scope,
                redirect_uri: process.env.redirect_uri,
                state: state
            }));
            
app.get('/callback', async (req, res) => {

    const setlistNum = req.session.setlistNum;

    // console.log(`song: ${gig.setlist[setlistNum].sets.set[0].song[0].name}`)
    // console.log(`artist: ${gig.setlist[setlistNum].artist.name}`)

    const code = req.query.code || null;
    const state = req.query.state || null;
    
    if (state === null) {
      res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    } else {
        const getToken = await fetch(`https://accounts.spotify.com/api/token`, {
            method: 'POST',
            headers: {
                'Authorization' : 'Basic ' + btoa(process.env.clientId + ':' + process.env.clientSecret),
                'Content-Type' : 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code: code,
                redirect_uri: process.env.redirect_uri,
                grant_type: 'authorization_code'
            })
        });   
        const data = await getToken.json();

        const getUser = await fetch(`https://api.spotify.com/v1/me`, {
            method: 'GET',
            headers: {
                'Authorization' : 'Bearer ' + data.access_token,
                'Content-Type' : 'application/json'
            },
            json: true
        });      
        const userData = await getUser.json();
        console.log(`userData:`);
        console.log(userData.id);

        const createPlaylist = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization' : 'Bearer ' + data.access_token,
                'Content-Type' : 'application/json'
            },
            body: JSON.stringify({
                name: `${gig.setlist[setlistNum].artist.name} (${gig.setlist[setlistNum].venue.name}, ${gig.setlist[setlistNum].venue.city.state})`,
                description: gig.setlist[setlistNum].eventDate,
                public: false
            }),
            json: true
        });      
        const playlist = await createPlaylist.json();
        // return console.log(playlist.id);

        for (let i = 0; i < gig.setlist[setlistNum].sets.set[0].song.length; i++) {

            // console.log(gig.setlist[setlistNum].sets.set[0].song[i].name);
            // console.log(gig.setlist[setlistNum].sets.set[0].song[i].name);
            // console.log(`${gig.setlist[setlistNum].artist.name}+${gig.setlist[setlistNum].sets.set[0].song[i].name}`);

            if (gig.setlist[setlistNum].sets.set[0].song[i].cover) {
                gig.setlist[setlistNum].sets.set[0].song[i].cover.name = gig.setlist[setlistNum].sets.set[0].song[i].cover.name.replace("'","");

                const getTrackIds = await fetch(`https://api.spotify.com/v1/search?q=artist%3A${gig.setlist[setlistNum].sets.set[0].song[i].cover.name}+track%3A${gig.setlist[setlistNum].sets.set[0].song[i].name}&type=track&limit=5`, {

                        method: 'GET',
                        headers: {
                            'Authorization' : 'Bearer ' + data.access_token,
                            'Content-Type' : 'application/json'
                        },
                        json: true
                    });
                    const result = await getTrackIds.json();

            // skips track if not found
            if (result.tracks.items[0] == undefined) {continue}
        
            const addTracks = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization' : 'Bearer ' + data.access_token,
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({
                uris: [`${result.tracks.items[0].uri}`]
                }),
                json: true
            });

        //     console.log(`${gig.setlist[setlistNum].sets.set[0].song[i].cover.name}+${gig.setlist[setlistNum].sets.set[0].song[i].name}`);
        //     console.log(result.tracks.items);
        // console.log(result.tracks.items[0].id);
        // console.log('/////////////////////////////////////////////////////////////////////////////////////////');
        
            } else {
                gig.setlist[setlistNum].sets.set[0].song[i].name = gig.setlist[setlistNum].sets.set[0].song[i].name.replace("'","");

                // const getTrackIds = await fetch(`https://api.spotify.com/v1/search?q=track%3A${gig.setlist[setlistNum].sets.set[0].song[i].name}+artist%3A${gig.setlist[setlistNum].artist.name}&type=track&limit=1`, {
            const getTrackIds = await fetch(`https://api.spotify.com/v1/search?q=artist%3A${gig.setlist[setlistNum].artist.name}+track%3A${gig.setlist[setlistNum].sets.set[0].song[i].name}&type=track&limit=5`, {

                        method: 'GET',
                        headers: {
                            'Authorization' : 'Bearer ' + data.access_token,
                            'Content-Type' : 'application/json'
                        },
                        json: true
                    });
                    const result = await getTrackIds.json();

            // skips track if not found
            if (result.tracks.items[0] == undefined) {continue}
        
            const addTracks = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization' : 'Bearer ' + data.access_token,
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({
                uris: [`${result.tracks.items[0].uri}`]
                }),
                json: true
            });
        //     console.log(`${gig.setlist[setlistNum].artist.name}+${gig.setlist[setlistNum].sets.set[0].song[i].name}`);
        //     console.log(result.tracks.items);
        // console.log(result.tracks.items[0].id);
        // console.log('/////////////////////////////////////////////////////////////////////////////////////////');
            }

            
        }
        
        // console.log(result);
        // console.log(`////////////////////////////////////////////////////////////`);
        


    }
    res.render('spotify');
});



    
});





function handleErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on port ${port}`)
})