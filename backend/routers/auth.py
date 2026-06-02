from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from spotipy.exceptions import SpotifyException
from utils.spotify import get_spotify_oauth

router = APIRouter(prefix="/auth", tags=["Authentication"])


class CallbackRequest(BaseModel):
    code: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.get("/login")
def login():
    """Generates the Spotify authorization URL and returns it to the frontend."""
    sp_oauth = get_spotify_oauth()
    auth_url = sp_oauth.get_authorize_url()
    return {"url": auth_url}


@router.post("/callback")
def callback(req: CallbackRequest):
    """Exchanges the authorization code for an access token."""
    sp_oauth = get_spotify_oauth()
    try:
        token_info = sp_oauth.get_access_token(req.code)
        return {
            "access_token": token_info['access_token'],
            "refresh_token": token_info.get('refresh_token')
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refresh")
def refresh(req: RefreshRequest):
    """Exchanges a refresh token for a new access token."""
    sp_oauth = get_spotify_oauth()
    try:
        token_info = sp_oauth.refresh_access_token(req.refresh_token)
        return {
            "access_token": token_info["access_token"],
            "refresh_token": token_info.get("refresh_token", req.refresh_token),
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
def get_me(authorization: str = Header()):
    """Fetches current user profile."""
    from utils.spotify import get_spotify_client
    sp = get_spotify_client(authorization)
    try:
        user = sp.current_user()
        return {
            "display_name": user.get("display_name"),
            "image": user.get("images")[0].get("url") if user.get("images") else None
        }
    except SpotifyException as e:
        raise HTTPException(status_code=e.http_status or 400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

