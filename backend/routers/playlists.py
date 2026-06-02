from fastapi import APIRouter, HTTPException, Header
from spotipy.exceptions import SpotifyException
from utils.spotify import get_spotify_client

router = APIRouter(prefix="/playlists", tags=["Playlists"])


@router.get("")
def get_playlists(authorization: str = Header()):
    """Fetches all of the current user's playlists."""
    sp = get_spotify_client(authorization)
    try:
        results = sp.current_user_playlists(limit=50)
        playlists = []
        for item in results['items']:
            if not item:
                continue
            
            # Safely get track count
            tracks_obj = item.get('tracks')
            items_obj = item.get('items')
            total_tracks = 0
            
            if isinstance(tracks_obj, dict):
                total_tracks = tracks_obj.get('total', 0)
            elif isinstance(items_obj, dict):
                total_tracks = items_obj.get('total', 0)

            playlists.append({
                "id": item['id'],
                "name": item.get('name', 'Unknown'),
                "tracks": total_tracks,
                "image": item['images'][0]['url'] if item.get('images') and len(item['images']) > 0 else None,
                "owner": item.get('owner', {}).get('display_name', 'Unknown')
            })
        return {"playlists": playlists}
    except SpotifyException as e:
        raise HTTPException(status_code=e.http_status or 400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{playlist_id}/tracks")
def get_playlist_tracks(playlist_id: str, authorization: str = Header()):
    """Fetches all tracks for a given playlist."""
    sp = get_spotify_client(authorization)
    try:
        print(f"DEBUG: Fetching tracks for playlist_id: {playlist_id}")
        all_items = []
        results = sp.playlist_items(playlist_id, limit=50)
        while results:
            all_items.extend(results.get('items', []))
            results = sp.next(results) if results.get('next') else None

        tracks = []
        for item in all_items:
            # spotipy 2.26+ uses "item" key; older responses used "track"
            track = item.get('item') or item.get('track')
            if not track:
                continue

            artists_str = ", ".join(a.get('name', 'Unknown') for a in track.get('artists', []))
            album = track.get('album', {})
            images = album.get('images', [])
            image_url = images[-1]['url'] if images else None

            tracks.append({
                "id": track.get('id') or f"local-{track.get('name')}",
                "name": track.get('name', 'Unknown Track'),
                "artists": artists_str,
                "album": album.get('name', 'Unknown Album'),
                "duration_ms": track.get('duration_ms', 0),
                "image": image_url
            })

        return {"tracks": tracks}
    except SpotifyException as e:
        raise HTTPException(status_code=e.http_status or 400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
