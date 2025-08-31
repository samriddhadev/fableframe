# Story to Video API Server

A FastAPI-based server for generating audio and video content from text and scripts, with support for content accumulation.

## Features

- **Audio Generation**: Convert text to audio with customizable voice settings
- **Video Generation**: Create videos from scripts with optional audio integration
- **Content Accumulation**: Process and accumulate multiple content items
- **Health Monitoring**: Built-in health check endpoint
- **Interactive Documentation**: Auto-generated API docs with Swagger UI

## API Endpoints

### Core Endpoints

- `POST /generate/audio` - Generate audio from text input
- `POST /generate/video` - Generate video from script and optional audio
- `POST /accumulate` - Process and accumulate multiple items

### Utility Endpoints

- `GET /` - API information and available endpoints
- `GET /health` - Health check endpoint

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Poetry (for dependency management)

### Installation

1. Install dependencies:
```bash
poetry install
```

2. Activate the virtual environment:
```bash
poetry shell
```

3. Start the development server:
```bash
poetry run uvicorn main:app --reload
```

The server will start on `http://localhost:8000`

### Alternative Start Method

You can also use the Poetry script:
```bash
poetry run start
```

## API Documentation

Once the server is running, visit:

- **Interactive API Docs (Swagger)**: `http://localhost:8000/docs`
- **Alternative API Docs (ReDoc)**: `http://localhost:8000/redoc`

## Example Usage

### Generate Audio

```bash
curl -X POST "http://localhost:8000/generate/audio" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test audio generation.",
    "voice_settings": {"speed": 1.0, "pitch": 0.5}
  }'
```

### Generate Video

```bash
curl -X POST "http://localhost:8000/generate/video" \
  -H "Content-Type: application/json" \
  -d '{
    "script": "This is a video script for testing.",
    "audio_file": "generated_audio_123.mp3",
    "video_settings": {"resolution": "1080p", "fps": 30}
  }'
```

### Accumulate Items

```bash
curl -X POST "http://localhost:8000/accumulate" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"type": "audio", "file": "audio1.mp3"},
      {"type": "video", "file": "video1.mp4"}
    ],
    "accumulation_type": "media_collection"
  }'
```

## Development

### Project Structure

```
.
├── main.py                 # FastAPI application and endpoints
├── pyproject.toml         # Poetry configuration and dependencies
├── README.md              # Project documentation
├── .github/
│   └── copilot-instructions.md  # Copilot customization
└── .vscode/
    └── tasks.json         # VS Code tasks configuration
```

### Development Dependencies

The project includes development tools:

- **pytest**: Testing framework
- **black**: Code formatting
- **isort**: Import sorting
- **flake8**: Linting

### Running Tests

```bash
poetry run pytest
```

### Code Formatting

```bash
poetry run black .
poetry run isort .
```

### Linting

```bash
poetry run flake8
```

## Configuration

The server runs with the following default settings:

- **Host**: 0.0.0.0 (all interfaces)
- **Port**: 8000
- **Reload**: Enabled in development mode

## Next Steps

This is a foundational implementation with placeholder logic. To make it production-ready:

1. **Integrate Real Services**: Replace placeholder logic with actual audio/video generation services
2. **Add Authentication**: Implement API key or OAuth-based authentication
3. **File Storage**: Add proper file storage and retrieval mechanisms
4. **Database Integration**: Store generation metadata and history
5. **Rate Limiting**: Implement request rate limiting
6. **Logging**: Add comprehensive logging and monitoring
7. **Error Handling**: Enhance error handling and validation
8. **Testing**: Add comprehensive test coverage

## License

This project is open source and available under the MIT License.
