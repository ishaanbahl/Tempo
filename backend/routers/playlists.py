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
def get_playlist_tracks(playlist_id: str, offset: int = 0, authorization: str = Header()):
    """Fetches one page (50 tracks) of a playlist. Returns has_more for pagination."""
    sp = get_spotify_client(authorization)
    try:
        results = sp.playlist_items(playlist_id, limit=50, offset=offset)
        items = results.get('items', [])
        has_more = results.get('next') is not None

        tracks = []
        for item in items:
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

        return {"tracks": tracks, "has_more": has_more, "offset": offset}
    except SpotifyException as e:
        raise HTTPException(status_code=e.http_status or 400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
