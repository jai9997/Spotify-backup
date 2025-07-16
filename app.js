const clientId = 'ac783809b3fd427faa79b5a2f420d04a';
const redirectUri = 'https://your-username.github.io/spotify-backup/';
const scopes = ['user-library-read', 'playlist-read-private', 'playlist-modify-public', 'playlist-modify-private'];

document.getElementById('login-btn').onclick = () => {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join('%20')}`;
  window.location.href = authUrl;
};

const token = new URLSearchParams(window.location.hash.substring(1)).get('access_token');
if (token) {
  document.getElementById('export-btn').disabled = false;
}

document.getElementById('export-btn').onclick = async () => {
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch user playlists
  const playlistsRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', { headers });
  const playlists = await playlistsRes.json();

  // Fetch saved tracks
  const savedRes = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', { headers });
  const savedTracks = await savedRes.json();

  const backup = { playlists: playlists.items, savedTracks: savedTracks.items };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'spotify-backup.json';
  a.click();
};

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const text = await file.text();
  const backup = JSON.parse(text);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  for (const pl of backup.playlists) {
    const createRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: pl.name, description: pl.description, public: pl.public }),
    });

    const newPl = await createRes.json();
    const trackUris = pl.tracks?.items?.map(item => item.track.uri).filter(Boolean) || [];

    for (let i = 0; i < trackUris.length; i += 100) {
      const uris = trackUris.slice(i, i + 100);
      await fetch(`https://api.spotify.com/v1/playlists/${newPl.id}/tracks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ uris }),
      });
    }
  }

  alert('Playlists restored!');
});
