# Tempo 🎵

Tempo is an AI-powered conversational interface that allows you to manage, curate, and manipulate your music playlists using natural language. 

By leveraging cutting-edge LLMs (Function Calling) and the Spotify Web API, you can simply type commands like *"Move all acoustic songs from Playlist A to Playlist B"* and Tempo will handle everything securely behind the scenes.

## 🛠️ Technology Stack
- **Frontend**: React.js powered by Vite (for a lightning-fast development experience) and Vanilla CSS for a premium, custom user interface.
- **Backend**: Python (using FastAPI) to execute AI intent logic, securely hold API keys, and manipulate playlists using `spotipy`.

---

## 🚀 How to Run Locally

Because this project is split into a frontend and a backend, you will need **two separate terminal windows/tabs** communicating simultaneously.

### 1. Starting the Backend (Python)
The backend acts as the secure middleman interfacing with the AI and Spotify.

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```
3. Install the required Python dependencies:
   ```bash
   pip install fastapi uvicorn spotipy openai python-dotenv
   ```
4. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   *(Your backend will start running on `http://localhost:8000`)*

### 2. Starting the Frontend (React/Vite)
The frontend handles all the stunning visual interfaces and chat functionality.

1. Open a **new terminal tab** and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the necessary Next/React dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(Your frontend will be accessible in your browser at `http://localhost:5173`)*

---

### 🔑 Prerequisites / API Keys
Before you can manipulate playlists, you will need access to OpenAI and Spotify. 
Inside your `/backend` folder, create a file named `.env` and fill it with your credentials:

```bash
OPENAI_API_KEY="your-openai-api-key"

SPOTIPY_CLIENT_ID="your-spotify-client-id"
SPOTIPY_CLIENT_SECRET="your-spotify-client-secret"
SPOTIPY_REDIRECT_URI="http://localhost:5173/callback" # Or your exact frontend URL
```