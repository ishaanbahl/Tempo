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
