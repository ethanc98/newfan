if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import querystring from 'query-string';
import fetch from 'cross-fetch';

const scope = 'playlist-modify-private';
const app = express();

const { clientId, clientSecret, redirect_uri, setlistfmKey, PORT, NODE_ENV } =
  process.env;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomStringGenerator = () =>
  (Math.random() + 1).toString(36).substring(2);

interface SetlistFmResponse {
  setlist: {
    id: string;
    artist: {
      name: string;
    };
    venue: {
      name: string;
      city: {
        state: string;
      };
    };
    eventDate: string;
    sets: {
      set: {
        song: {
          name: string;
          cover?: {
            name: string;
          };
        }[];
      }[];
    };
  }[];
}

let gig: SetlistFmResponse = { setlist: [] };
let setlistId = 0;
interface Setlist {
  id: string;
  artist: {
    name: string;
  };
  venue: {
    name: string;
    city: {
      state: string;
    };
  };
  eventDate: string;
  sets: {
    set: {
      song: {
        name: string;
        cover?: {
          name: string;
        };
      }[];
    }[];
  };
}

let selectedSetlist: Setlist | null = null;

app.get('/', (req: Request, res: Response) => {
  res.render('index');
});

app.get('/builder', (req: Request, res: Response) => {
  res.render('builder');
});

app.post('/get-artists', async (req: Request, res: Response) => {
  try {
    if (!setlistfmKey) {
      res.status(400).send('API key is missing');
      return;
    }

    const artistKey = await fetch(
      `https://api.setlist.fm/rest/1.0/search/artists?artistName=${req.body.value}&p=1&sort=relevance`,
      {
        method: 'GET',
        headers: {
          'x-api-key': setlistfmKey,
          Accept: 'application/json',
        },
      }
    );

    if (!artistKey.ok) {
      throw new Error('Failed to fetch artist data');
    }

    const artistData = await artistKey.json();
    res.json(artistData);
    return;
  } catch (e: unknown) {
    if (e instanceof Error) {
      res.status(500).json({ error: e.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
    return;
  }
});

app.post('/get-setlists', async (req: Request, res: Response) => {
  if (!setlistfmKey) {
    res.status(400).send('API key is missing');
    return;
  }

  // delay to accomodate 2-req p/s api limit
  await sleep(1000);

  // uses 'mbid' to grab artists most recent setlists
  const setlists = await fetch(
    `https://api.setlist.fm/rest/1.0/artist/${req.body.value}/setlists?p=1`,
    {
      method: 'GET',
      headers: {
        'x-api-key': setlistfmKey,
        Accept: 'application/json',
      },
    }
  );

  const gigsData = await setlists.json();
  const stringified = JSON.stringify(gigsData);

  if (stringified.includes('Too Many Requests')) {
    console.log(`${stringified} had too many requests`);
    return;
  }
  gig = gigsData;
  res.json(gigsData);
  return;
});

app.post('/spotify', (req, res) => {
  setlistId = req.body.setlistId;
  selectedSetlist = gig.setlist.filter(
    (setlist: Setlist) => setlist.id === setlistId.toString()
  )[0];

  if (!selectedSetlist) {
    res.status(400).send('Setlist not found');
    return;
  }

  res.redirect('/spotify');
});

app.get('/spotify', (req: Request, res: Response) => {
  const state = randomStringGenerator();
  res.redirect(
    `https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: 'code',
      show_dialog: true,
      client_id: clientId,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
    })}`
  );
});

app.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (!state || typeof code !== 'string' || typeof redirect_uri !== 'string') {
    res.redirect(
      `/#${querystring.stringify({
        error: 'state_mismatch',
      })}`
    );
    return;
  }

  try {
    const tokenResponse = await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code',
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to fetch token');
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }

    const userData = await userResponse.json();

    if (!selectedSetlist) {
      res.status(400).send('Selected setlist is null');
      return;
    }

    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${selectedSetlist.artist.name} (${selectedSetlist.venue.name}, ${selectedSetlist.venue.city.state})`,
          description: selectedSetlist.eventDate,
          public: false,
        }),
      }
    );

    if (!playlistResponse.ok) {
      throw new Error('Failed to create playlist');
    }

    const playlist = await playlistResponse.json();

    for (const song of selectedSetlist.sets.set[0].song) {
      const artistName = song.cover
        ? song.cover.name
        : selectedSetlist.artist.name;
      const trackName = song.name;

      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(
          artistName
        )}+track:${encodeURIComponent(trackName)}&type=track&limit=5`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!searchResponse.ok) {
        console.error(`Failed to search for track: ${trackName}`);
        continue;
      }

      const searchResult = await searchResponse.json();
      const trackUri = searchResult.tracks.items[0]?.uri;

      if (!trackUri) {
        console.warn(`Track not found: ${trackName}`);
        continue;
      }

      const addTrackResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: [trackUri],
          }),
        }
      );

      if (!addTrackResponse.ok) {
        console.error(`Failed to add track: ${trackName}`);
      }
    }

    res.render('end', { playlist });
  } catch (error) {
    console.error('Error:', error);
    res.redirect(
      `/#${querystring.stringify({
        error: 'invalid_token',
      })}`
    );
  }
});

app.all('*', (req: Request, res: Response, next) => {
  res.redirect('/');
});

if (NODE_ENV !== 'production') {
  const port = PORT || 3000;
  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}/`);
  });
}

export default app;
