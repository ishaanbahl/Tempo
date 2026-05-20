from fastapi import APIRouter, HTTPException, Header
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
    except Exception as e:
        print(f"PLAYLIST ERROR: {type(e).__name__}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{playlist_id}/tracks")
def get_playlist_tracks(playlist_id: str, authorization: str = Header()):
    """Fetches all tracks for a given playlist."""
    sp = get_spotify_client(authorization)
    try:
        print(f"DEBUG: Fetching tracks for playlist_id: {playlist_id}")
        results = sp.playlist_tracks(playlist_id, limit=100)
        
        items = results.get('items', [])
        print(f"DEBUG: Spotify returned {len(items)} items")
        
        if items and len(items) > 0:
            print(f"DEBUG: First item keys: {items[0].keys()}")
            if 'track' in items[0]:
                print(f"DEBUG: 'track' found in first item")
            else:
                print(f"DEBUG: 'track' NOT found in first item. Data: {str(items[0])[:200]}...")

        tracks = []
        for item in items:
            # Match both possible Spotify response formats
            track = item.get('track') or item.get('item')
            
            if not track:
                continue
            
            # Safely handle artists
            artists_list = track.get('artists', [])
            artists_str = ", ".join([a.get('name', 'Unknown') for a in artists_list])
            
            # Safely handle images
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
        
        print(f"DEBUG: Successfully processed {len(tracks)} tracks")
        return {"tracks": tracks}
    except Exception as e:
        print(f"TRACK FETCH ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
