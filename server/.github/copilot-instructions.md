<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Story to Video API Server

This is a FastAPI-based server for generating audio and video content from text/scripts, with an accumulation endpoint for processing multiple items.

## Key Guidelines

### Code Style
- Use Python 3.8+ features
- Follow FastAPI best practices with Pydantic models for request/response validation
- Use async/await patterns for all endpoints
- Implement proper error handling with HTTPException
- Use type hints throughout the codebase

### API Design
- All endpoints should return consistent response models
- Use proper HTTP status codes
- Include comprehensive error messages
- Add metadata to responses for debugging and monitoring

### Project Structure
- Keep the main FastAPI app in `main.py`
- Use Pydantic models for request/response validation
- Separate business logic into service modules when the project grows
- Add proper logging for debugging and monitoring

### Dependencies
- Use Poetry for dependency management
- Pin major versions but allow minor/patch updates
- Separate development and production dependencies

### Testing
- Write unit tests for all endpoints
- Use pytest-asyncio for async testing
- Test both success and error scenarios
- Mock external services and file operations
