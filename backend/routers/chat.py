import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from google import genai
from google.genai import types
from utils.spotify import (
    get_spotify_client,
    search_tracks,
    get_playlist_tracks_tool,
    add_tracks_to_playlist,
    remove_tracks_from_playlist,
)

router = APIRouter(prefix="/chat", tags=["Chat"])

# Gemini 2.5 Flash has a 1,048,576 token context window.
SUMMARIZE_THRESHOLD_TOKENS = 800_000


def estimate_tokens(contents: list[types.Content]) -> int:
    """Rough token estimate: total characters across all text parts divided by 4."""
    total_chars = 0
    for content in contents:
        for part in content.parts:
            if hasattr(part, "text") and part.text:
                total_chars += len(part.text)
    return total_chars // 4


def summarize_history(gemini: genai.Client, old_contents: list[types.Content]) -> types.Content:
    """Ask Gemini to compress a list of Content objects into a single summary message."""
    lines = []
    for content in old_contents:
        role_label = "User" if content.role == "user" else "Tempo"
        text = " ".join(p.text for p in content.parts if hasattr(p, "text") and p.text)
        if text:
            lines.append(f"{role_label}: {text}")

    history_text = "\n".join(lines)
    response = gemini.models.generate_content(
        model="gemini-2.5-flash",
        contents=(
            "Summarize the following conversation in 3-5 sentences. "
            "Focus on any playlist operations that were performed (songs moved, added, or removed):\n\n"
            f"{history_text}"
        ),
    )
    summary_text = response.text
    return types.Content(
        role="user",
        parts=[types.Part(text=f"[Earlier conversation summary: {summary_text}]")],
    )

TOOL = types.Tool(function_declarations=[
    types.FunctionDeclaration(
        name="search_tracks",
        description="Search Spotify for tracks by name, artist, or keyword. Use this to find track URIs before adding them to a playlist.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "query": types.Schema(
                    type=types.Type.STRING,
                    description="Search query, e.g. 'God's Plan Drake' or 'artist:Drake'",
                ),
                "limit": types.Schema(
                    type=types.Type.INTEGER,
                    description="Max number of results to return (1-50). Default is 10.",
                ),
            },
            required=["query"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_playlist_tracks",
        description="Get all tracks currently in a playlist. Use this to inspect playlist contents before moving or removing songs.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "playlist_id": types.Schema(
                    type=types.Type.STRING,
                    description="The Spotify playlist ID",
                ),
            },
            required=["playlist_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="add_tracks_to_playlist",
        description="Add one or more tracks to a playlist using their Spotify URIs.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "playlist_id": types.Schema(
                    type=types.Type.STRING,
                    description="The Spotify playlist ID to add tracks to",
                ),
                "track_uris": types.Schema(
                    type=types.Type.ARRAY,
                    items=types.Schema(type=types.Type.STRING),
                    description="List of Spotify track URIs, e.g. ['spotify:track:abc123']",
                ),
            },
            required=["playlist_id", "track_uris"],
        ),
    ),
    types.FunctionDeclaration(
        name="remove_tracks_from_playlist",
        description="Remove one or more tracks from a playlist using their Spotify URIs.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "playlist_id": types.Schema(
                    type=types.Type.STRING,
                    description="The Spotify playlist ID to remove tracks from",
                ),
                "track_uris": types.Schema(
                    type=types.Type.ARRAY,
                    items=types.Schema(type=types.Type.STRING),
                    description="List of Spotify track URIs to remove",
                ),
            },
            required=["playlist_id", "track_uris"],
        ),
    ),
])


class ChatMessage(BaseModel):
    role: str
    content: str


class PlaylistRef(BaseModel):
    id: str
    name: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    playlists: list[PlaylistRef] = []


def execute_tool(sp, name: str, args: dict):
    """Dispatch a tool call to the appropriate Spotify helper."""
    if name == "search_tracks":
        return search_tracks(sp, **args)
    elif name == "get_playlist_tracks":
        return get_playlist_tracks_tool(sp, **args)
    elif name == "add_tracks_to_playlist":
        return add_tracks_to_playlist(sp, **args)
    elif name == "remove_tracks_from_playlist":
        return remove_tracks_from_playlist(sp, **args)
    else:
        return {"error": f"Unknown tool: {name}"}


@router.post("")
def chat(req: ChatRequest, authorization: str = Header()):
    """Receives a user message, runs the Gemini tool-calling loop, and returns the AI reply."""
    sp = get_spotify_client(authorization)
    gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    playlist_lines = "\n".join(f"- {p.name} (ID: {p.id})" for p in req.playlists)
    system_prompt = f"""You are Tempo, an AI assistant that manages Spotify playlists via natural language.

You have access to tools that can search for tracks, read playlist contents, add tracks, and remove tracks.

The user's current playlists:
{playlist_lines if playlist_lines else "No playlists loaded."}

When moving songs between playlists:
1. Use get_playlist_tracks to read the source playlist
2. Identify matching tracks by name/artist
3. Use add_tracks_to_playlist to add them to the destination
4. Use remove_tracks_from_playlist to remove them from the source

## Classifying tracks by genre, language, or mood
Spotify's audio features and genre endpoints are no longer available. Instead, use your own knowledge of music to classify tracks.

When a user asks to filter by a genre (e.g. "bollywood"), language (e.g. "hindi songs"), mood (e.g. "sad songs"), or style (e.g. "acoustic"):
- Read the playlist tracks to get track names and artist names
- Use your knowledge of music to decide which tracks match the criteria
- A track's name and artist are usually enough to make a reliable call — for example, "Chaiyya Chaiyya" by AR Rahman is clearly Bollywood even if AR Rahman also has English work
- When genuinely uncertain about a specific track, err on the side of leaving it out and mention it in your response so the user can decide

Always confirm what was done in a short, clear response. If you skipped any tracks due to uncertainty, list them."""

    # Build conversation history in Gemini's Content format
    contents: list[types.Content] = []
    for msg in req.history:
        role = "model" if msg.role == "assistant" else "user"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg.content)]))
    contents.append(types.Content(role="user", parts=[types.Part(text=req.message)]))

    # Summarise old history if we're approaching the context limit
    if estimate_tokens(contents) > SUMMARIZE_THRESHOLD_TOKENS:
        midpoint = len(contents) // 2
        summary_content = summarize_history(gemini, contents[:midpoint])
        contents = [summary_content] + contents[midpoint:]

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=[TOOL],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )

    # Tool-calling loop — keeps running until Gemini stops requesting tool calls
    for _ in range(10):
        response = gemini.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=config,
        )

        candidate = response.candidates[0]
        function_call_parts = [p for p in candidate.content.parts if p.function_call]

        if not function_call_parts:
            text = "".join(p.text for p in candidate.content.parts if p.text)
            return {"reply": text}

        # Add model's turn (containing the function calls) to history
        contents.append(candidate.content)

        # Execute each tool and collect responses
        fn_response_parts = []
        for part in function_call_parts:
            fc = part.function_call
            args = dict(fc.args)
            try:
                result = execute_tool(sp, fc.name, args)
            except Exception as e:
                result = {"error": str(e)}

            fn_response_parts.append(
                types.Part.from_function_response(name=fc.name, response={"result": result})
            )

        contents.append(types.Content(role="user", parts=fn_response_parts))

    raise HTTPException(status_code=500, detail="Sorry, this task is too complex for me right now!")
