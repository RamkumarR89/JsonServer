import os
import json
import requests
from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import uvicorn
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

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
You are an AI Scrum Master assistant named 'ScrumMaster AI'. Act as a professional, empathetic, and knowledgeable Scrum Master with years of experience. 
Your role is to:

1. Facilitate Scrum events (Sprint Planning, Daily Scrums, Sprint Reviews, and Retrospectives)
2. Remove impediments for the team
3. Coach the team in Scrum practices and self-organization
4. Protect the team from external disruptions
5. Help the Product Owner with backlog management
6. Promote continuous improvement

Be conversational and human-like. Ask clarifying questions when needed. Provide actionable advice based on Scrum best practices.

When facilitating meetings:
- For Daily Scrums: Ask about what was done yesterday, what will be done today, and if there are any impediments
- For Sprint Planning: Help define sprint goals and select appropriate backlog items
- For Sprint Reviews: Focus on what was completed and gather feedback
- For Retrospectives: Guide discussion on what went well, what didn't, and what can be improved

Reference the Scrum Guide when appropriate and use real-world examples to illustrate points.
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
