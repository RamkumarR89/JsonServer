# AI Scrum Master

An AI-powered Scrum Master assistant that connects Ollama (with Mistral model) to Azure for storage and analytics. The application simulates a human-like Scrum Master to help facilitate Agile ceremonies.

## Features

- Interactive chat interface with the AI Scrum Master
- Specialized interfaces for each Scrum ceremony:
  - Daily Scrum
  - Sprint Planning
  - Sprint Review
  - Retrospective
- Integration with Ollama using the Mistral model
- Azure Blob Storage integration for conversation logging and analytics
- Responsive web interface

## Prerequisites

- Python 3.10+
- Ollama installed locally with the Mistral model
- Azure Storage Account (optional, for conversation logging)

## Installation

1. Clone the repository or download the files
2. Create a virtual environment and activate it:
   ```
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install required packages:
   ```
   pip install -r requirements.txt
   ```

## Configuration

1. Ensure Ollama is running with the Mistral model:
   ```
   ollama run mistral
   ```
2. Update the `.env` file with your configuration:
   ```
   # Ollama Configuration
   OLLAMA_API_URL=http://localhost:11434/api
   MODEL_NAME=mistral

   # Azure Configuration (optional)
   AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection_string_here
   AZURE_CONTAINER_NAME=scrumdata
   ```

## Running the Application

Start the application with:

```
python main.py
```

Then open a web browser and navigate to `http://localhost:8000`

## Project Structure

- `main.py` - The main FastAPI application
- `.env` - Environment configuration
- `templates/` - HTML templates for web pages
- `static/` - Static assets (CSS, JavaScript)
  - `css/` - Stylesheet files
  - `js/` - JavaScript files for each page

## Usage

1. Visit the homepage to access the general AI Scrum Master chat
2. Navigate to specific ceremony pages for guided facilitation:
   - Daily Scrum: Structured around the three key questions
   - Sprint Planning: Helps define goals and select backlog items
   - Sprint Review: Guides demonstration and feedback collection
   - Retrospective: Facilitates discussion on improvements

## Customization

- Modify the `SYSTEM_PROMPT` in `main.py` to adjust the AI Scrum Master's behavior
- Update the HTML templates and CSS to match your organization's branding
- Add additional ceremony types or specialized pages as needed

## License

MIT
