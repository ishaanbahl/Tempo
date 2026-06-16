import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import auth, playlists, chat

load_dotenv()

app = FastAPI()

# ALLOWED_ORIGINS env var is a comma-separated list of frontend URLs.
# Locally defaults to the Vite dev server; in production set it to your Vercel URL.
_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(playlists.router)
app.include_router(chat.router)
