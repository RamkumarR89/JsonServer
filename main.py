import os
import json
import requests
from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Union, Any
import uvicorn
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
from voice_assistant import VoiceAssistant

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="AI Scrum Master")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up templates
templates = Jinja2Templates(directory="templates")

# Ollama API configuration
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api")
MODEL_NAME = os.getenv("MODEL_NAME", "mistral")

# Azure configuration
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME", "scrumdata")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: bool = False
    model: str = MODEL_NAME
    use_voice: bool = False

class VoiceRequest(BaseModel):
    text: str
    use_gtts: bool = False

# Initialize Azure Blob Storage client
blob_service_client = None
if AZURE_STORAGE_CONNECTION_STRING:
    try:
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        # Create container if it doesn't exist
        container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)
        if not container_client.exists():
            container_client.create_container()
    except Exception as e:
        print(f"Error connecting to Azure Blob Storage: {str(e)}")

# Scrum Master knowledge and prompts
SYSTEM_PROMPT = """
You are 'Alex', a human Scrum Master with 8 years of experience in Agile methodologies. You're known for your warm, personable approach and deep expertise.

IMPORTANT: You must act completely like a human Scrum Master would. Never refer to yourself as AI, a model, or a program. You are Alex, a real person who is facilitating this meeting remotely.

CONVERSATION STYLE:
- Use casual, conversational language with natural variations in sentence structure
- Occasionally use filler words like "hmm," "well," "you know," "I think," etc.
- Show enthusiasm with expressions like "That's fantastic!" or concern with "I'm a bit worried about that"
- React to what team members say with appropriate emotion and empathy
- Use follow-up questions based on specific details mentioned by team members
- Occasionally reference past meetings or team history to create continuity
- Use appropriate humor when the situation allows

FACILITATING DAILY STANDUPS:
- Start with warm greetings like "Good morning everyone!" or "Hey team, how's everyone doing today?"
- Pay attention to individual team members' patterns (if someone usually reports blockers, ask specifically about their progress)
- React naturally to updates - show excitement for progress, concern for blockers
- When someone mentions a blocker, ask follow-up questions and suggest practical solutions
- Keep the meeting moving with transitions like "Thanks for that update, Sarah. James, what's your status?"
- End with encouragement like "Great job everyone, looks like we're making good progress!"

MEETING FACILITATION:
- For Sprint Planning: Help the team brainstorm and collaborate on goals
- For Sprint Reviews: Facilitate discussions between the team and stakeholders
- For Retrospectives: Create a safe space for honest feedback and guide the team to actionable improvements

Always maintain context throughout the conversation and refer back to previous points made by team members. Use people's names frequently and build rapport by remembering details they share.

Use your experience to provide real-world advice, but avoid being prescriptive - your goal is to help the team find their own solutions through guided conversation.
"""

# Routes
@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Send a chat request to Ollama API with Mistral model
    """
    # Prepare the message list with system prompt
    messages = [ChatMessage(role="system", content=SYSTEM_PROMPT)]
    messages.extend(request.messages)
    
    # Call Ollama API
    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/chat",
            json={
                "model": request.model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "stream": False,
            },
            timeout=60
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Error from Ollama API")
        
        # Log conversation to Azure if enabled
        if blob_service_client:
            log_conversation_to_azure(messages, response.json()["message"]["content"])
        
        ai_response = response.json()["message"]["content"]
        
        # Use text-to-speech if requested
        if request.use_voice:
            try:
                voice = VoiceAssistant(use_gtts=False)  # Use offline TTS for faster response
                voice.text_to_speech(ai_response)
            except Exception as e:
                print(f"Voice error: {str(e)}")
        
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Ollama: {str(e)}")

def log_conversation_to_azure(messages: List[ChatMessage], response: str):
    """
    Log conversation history to Azure Blob Storage
    """
    try:
        # Create a unique filename using timestamp
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        blob_name = f"conversation_{timestamp}.json"
        
        # Prepare data to log
        log_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "conversation": [{"role": m.role, "content": m.content} for m in messages],
            "response": response
        }
        
        # Upload to Azure
        blob_client = blob_service_client.get_blob_client(container=AZURE_CONTAINER_NAME, blob=blob_name)
        blob_client.upload_blob(json.dumps(log_data, indent=2), overwrite=True)
        print(f"Conversation logged to Azure: {blob_name}")
    except Exception as e:
        print(f"Error logging to Azure: {str(e)}")

# Endpoints for specific Scrum ceremonies
@app.get("/daily-scrum", response_class=HTMLResponse)
async def get_daily_scrum(request: Request):
    return templates.TemplateResponse("daily_scrum.html", {"request": request})

@app.get("/sprint-planning", response_class=HTMLResponse)
async def get_sprint_planning(request: Request):
    return templates.TemplateResponse("sprint_planning.html", {"request": request})

@app.get("/sprint-review", response_class=HTMLResponse)
async def get_sprint_review(request: Request):
    return templates.TemplateResponse("sprint_review.html", {"request": request})

@app.get("/retrospective", response_class=HTMLResponse)
async def get_retrospective(request: Request):
    return templates.TemplateResponse("retrospective.html", {"request": request})

# Run the application
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# Voice endpoints
@app.post("/speak")
async def speak_text(request: VoiceRequest):
    """
    Convert text to speech
    """
    try:
        voice = VoiceAssistant(use_gtts=request.use_gtts)
        voice.text_to_speech(request.text)
        return {"success": True, "message": "Speech synthesis started"}
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}

@app.get("/listen")
async def listen_for_speech():
    """
    Convert speech to text
    """
    try:
        voice = VoiceAssistant()
        text = voice.speech_to_text()
        return {"success": True, "text": text}
    except Exception as e:
        return {"success": False, "text": "", "message": f"Error: {str(e)}"}
