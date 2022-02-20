const querystring = require('query-string');
        

const APIController = (function() {
    const clientId = 'cf7de4e2b7f84cf6bdee6e7f357d68e0';
    const clientSecret = '02d18ebaaa5a4fd89afba514efb92c9e';
    var scope = 'user-read-private user-read-email';
    const redirect_uri = 'http://localhost:3000/';

    console.log('APICALLED');

    const authenticate = async () => {
        res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri
    }));
    }



    // private methods
    const _getToken = async () => {

        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/x-www-form-urlencoded', 
                'Authorization' : 'Basic ' + btoa(clientId + ':' + clientSecret)
            },
            body: 'grant_type=client_credentials'
        });

        const data = await result.json();
        localStorage.setItem('token', data.access_token);
        // console.log(data.access_token);
        return data.access_token;
    }

    const _createPlaylist = async (token) => {

        const result = await fetch(`https://api.spotify.com/v1/users/ethanc98-gb/playlists`, {
            method: 'POST',
            headers: {
                'Authorization' : 'Bearer ' + token,
                'Accept': 'application/json'
        },
            body: {
                'name': 'API Playlist',
                'description': 'API playlist description',
                'public': 'false'
            }
        });

        const data = await result.json();
        return data;
    }
    _getToken();
    _createPlaylist(localStorage.getItem('token'));
})();
