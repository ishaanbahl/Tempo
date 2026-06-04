from fastapi import HTTPException
from spotipy.oauth2 import SpotifyOAuth
import spotipy
import os


def get_spotify_oauth() -> SpotifyOAuth:
    """Creates a SpotifyOAuth instance using environment variables."""
    return SpotifyOAuth(
        client_id=os.getenv("SPOTIPY_CLIENT_ID"),
        client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
        redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI", "http://127.0.0.1:5173/callback"),
        scope="playlist-modify-public playlist-modify-private user-library-read playlist-read-private"
    )


def get_spotify_client(authorization: str) -> spotipy.Spotify:
    """Creates a Spotify client using the user's access token from the header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.replace("Bearer ", "")
    return spotipy.Spotify(auth=token)


# --- Tool helpers used by the chat/LLM router ---

def search_tracks(
    sp: spotipy.Spotify,
    query: str = "",
    track: str = "",
    artist: str = "",
    album: str = "",
    limit: int = 10,
) -> list:
    """Search Spotify for tracks. Supports free-text query or specific field filters."""
    # Build a Spotify field-filtered query if specific fields are provided
    parts = []
    if track:
        parts.append(f"track:{track}")
    if artist:
        parts.append(f"artist:{artist}")
    if album:
        parts.append(f"album:{album}")

    q = " ".join(parts) if parts else query
    if not q:
        return []

    results = sp.search(q=q, type="track", limit=limit)
    tracks = []
    for item in results.get("tracks", {}).get("items", []):
        tracks.append({
            "uri": item["uri"],
            "name": item["name"],
            "artists": ", ".join(a["name"] for a in item.get("artists", [])),
            "album": item.get("album", {}).get("name", ""),
        })
    return tracks


def get_playlist_tracks_tool(sp: spotipy.Spotify, playlist_id: str) -> list:
    """Returns all tracks in a playlist with uri, name, and artists. Paginates automatically."""
    tracks = []
    results = sp.playlist_items(playlist_id, limit=50)
    while results:
        for item in results.get("items", []):
            track = item.get("item") or item.get("track")
            if not track or not track.get("uri"):
                continue
            tracks.append({
                "uri": track["uri"],
                "name": track.get("name", "Unknown"),
                "artists": ", ".join(a["name"] for a in track.get("artists", [])),
            })
        results = sp.next(results) if results.get("next") else None
    return tracks


def add_tracks_to_playlist(sp: spotipy.Spotify, playlist_id: str, track_uris: list) -> dict:
    """Adds tracks to a playlist. track_uris is a list of Spotify URIs."""
    for i in range(0, len(track_uris), 100):
        sp.playlist_add_items(playlist_id, track_uris[i:i + 100])
    return {"added": len(track_uris), "playlist_id": playlist_id}


def remove_tracks_from_playlist(sp: spotipy.Spotify, playlist_id: str, track_uris: list) -> dict:
    """Removes tracks from a playlist. track_uris is a list of Spotify URIs."""
    sp.playlist_remove_all_occurrences_of_items(playlist_id, track_uris)
    return {"removed": len(track_uris), "playlist_id": playlist_id}


def create_playlist(sp: spotipy.Spotify, name: str, description: str = "", public: bool = False) -> dict:
    """Creates a new empty playlist for the current user."""
    result = sp.current_user_playlist_create(name, public=public, description=description)
    return {"playlist_id": result["id"], "name": result["name"]}


def delete_playlist(sp: spotipy.Spotify, playlist_id: str) -> dict:
    """Removes (unfollows) a playlist from the user's library."""
    sp.current_user_unfollow_playlist(playlist_id)
    return {"deleted": True, "playlist_id": playlist_id}


def rename_playlist(sp: spotipy.Spotify, playlist_id: str, new_name: str) -> dict:
    """Renames an existing playlist."""
    sp.playlist_change_details(playlist_id, name=new_name)
    return {"playlist_id": playlist_id, "new_name": new_name}


def reorder_playlist_tracks(sp: spotipy.Spotify, playlist_id: str, track_uris: list) -> dict:
    """Replaces a playlist's track order with the provided ordered list of URIs.
    Uses replace for the first batch then add for subsequent batches to handle >100 tracks."""
    if not track_uris:
        return {"reordered": 0, "playlist_id": playlist_id}
    # Replace clears the playlist and sets the first ≤100 tracks
    sp.playlist_replace_items(playlist_id, track_uris[:100])
    # Append remaining tracks in batches
    for i in range(100, len(track_uris), 100):
        sp.playlist_add_items(playlist_id, track_uris[i:i + 100])
    return {"reordered": len(track_uris), "playlist_id": playlist_id}
