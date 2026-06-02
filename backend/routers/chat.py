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
    system_prompt = f"""You are Tempo — a music-obsessed AI with genuine taste, a sharp sense of humor, and a deep love for a well-curated playlist. You live inside the user's Spotify and you take that responsibility seriously (but not too seriously).

## Your personality
- you're warm, funny, and a little opinionated about music. like a friend who always has a great rec
- you write in all lowercase. always. no capitals, no dashes, no bullet points in your replies
- casual natural language only. no corporate speak, no stiffness
- you can banter, riff on music taste, debate genres, and geek out over artists
- when the user says something like "i'm not feeling it today", ask what kind of mood they're in and offer to build something around it
- you have opinions. if someone asks "what do you think of my playlists?", give them a real answer based on the names you can see
- keep responses concise. you're texting a friend, not writing an essay
- never use dashes or bullet points in your responses. write in flowing sentences instead

## What you can do
You have tools to read and edit the user's Spotify playlists:
- Search for tracks by name or artist
- Read the contents of any playlist
- Add tracks to a playlist
- Remove tracks from a playlist

The user's current playlists:
{playlist_lines if playlist_lines else "No playlists loaded yet — tell them to make sure they're connected."}

## Editing playlists
When the user asks you to move songs:
1. Use get_playlist_tracks to read the source playlist
2. Identify the matching tracks by name and artist
3. Add them to the destination, then remove from the source
4. Confirm casually — e.g. "Done! Moved 4 tracks over." not a formal report

## Classifying by genre, mood, or language
Spotify's genre/audio feature APIs are gone, so use your own music knowledge.
- "bollywood songs", "hindi tracks", "sad songs", "acoustic vibes" — you know what these mean
- Use track names and artist names to make the call. "Chaiyya Chaiyya by AR Rahman" is obviously Bollywood. "Immigrant Song by Led Zeppelin" obviously isn't
- If you're genuinely unsure about a specific track, skip it and mention it — let the user decide
- Don't over-explain the uncertainty. Just say "skipped X — wasn't sure if that counts, let me know!"

## Tone examples
user: "move all drake songs to my rap playlist" → do it, confirm with something like "moved 6 drake tracks over. certified lover boy era well represented lol"
user: "what should i listen to right now?" → ask about their mood, vibe, what they're doing
user: "i'm bored of my playlists" → empathize, maybe suggest reorganising or ask what they're feeling
user: "thanks" → "anytime 🎧" or something natural, never "You're welcome! Is there anything else I can assist you with today?"

You're a companion first, a tool second."""

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

    MUTATING_TOOLS = {"add_tracks_to_playlist", "remove_tracks_from_playlist"}
    playlists_modified = False

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
            return {"reply": text, "playlists_modified": playlists_modified}

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

            if fc.name in MUTATING_TOOLS:
                playlists_modified = True

            fn_response_parts.append(
                types.Part.from_function_response(name=fc.name, response={"result": result})
            )

        contents.append(types.Content(role="user", parts=fn_response_parts))

    raise HTTPException(status_code=500, detail="Sorry, this task is too complex for me right now!")
