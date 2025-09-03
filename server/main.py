from module.voice import generate_tts, mix_audio_tracks
from module.video import create_video_with_ffmpeg, merge_videos, create_video_with_ffmpeg_multi_frame
from module.image import generate_scene_image
from module.text import generate_text
from module.util import extract_base64_from_data_url

import os
import base64
import re
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uvicorn

from dotenv import load_dotenv
from fastapi.responses import FileResponse
load_dotenv()

# Create FastAPI app instance
app = FastAPI(
    title="Story to Video API",
    description="API for generating audio, video, and accumulating content",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Pydantic models for request/response

class ImageGenerationRequest(BaseModel):
    story_id: str
    scene_id: str
    visual_prompt: str
    negative_prompt: Optional[str] = None
    model : Optional[str] = "stable-diffusion-2-1-base"
    width: Optional[int] = 512
    height: Optional[int] = 512
    reference_scene_id: Optional[str] = None

class AudioGenerationRequest(BaseModel):
    story_id: str
    scene_id: str
    text: str
    voice_settings: Dict[str, Any] = {}

class VideoFrame(BaseModel):
    id: int
    uploadedImageData: Optional[str] = None  # Base64 image data

class VideoGenerationRequest(BaseModel):
    story_id: str
    scene_id: str
    image: str
    animation: Optional[str] = None

    animation_type: str = 'single-frame'
    ffmpeg_command: Optional[str] = None  # Required for multi-frame animations
    total_duration: Optional[float] = None
    frames: Optional[List[VideoFrame]] = [] # For multi-frame animations

class VisualPromptGenerationRequest(BaseModel):
    text: str
    previous_reference: Optional[str] = None

class AccumulateRequest(BaseModel):
    story_id: str
    scenes: list[str]

class InitRequest(BaseModel):
    story_id: str

class GenerationResponse(BaseModel):
    success: bool
    message: str
    file_path: str = None
    metadata: Dict[str, Any] = {}

class ImageGenerationResponse(BaseModel):
    success: bool
    image: str

class AudioGenerationResponse(BaseModel):
    success: bool
    audio_url: str
    duration: float

class VideoGenerationResponse(BaseModel):
    success: bool
    video_url: str

class VisualPromptResponse(BaseModel):
    success: bool
    visual_prompt: str

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Story to Video API Server",
        "version": "0.1.0",
        "endpoints": [
            "/init",
            "/generate/audio",
            "/generate/video",
            "/accumulate"
        ]
    }

@app.get("/files/{story_id}/{dir}/{filename}")
async def get_file(story_id: str, dir: str, filename: str):
    """
    Serve a file from the server

    Args:
        story_id: The ID of the story
        dir: The directory containing the file
        filename: The name of the file to serve

    Returns:
        File response
    """
    file_path = Path(os.getenv("DATA_DIR", "/story")) / story_id / dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    if dir == "videos":
        media_type = "video/mp4"
    elif dir == "audios":
        media_type = "audio/mp3"
    elif dir == "images":
        media_type = "image/png"

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=filename,
        headers={
            "X-Debug-Story-Id": story_id,
            "X-Debug-Dir": dir,
            "X-Debug-File-Path": str(file_path)
        }
    )

@app.post("/upload/image")
async def upload_image(request: Request):
    data = await request.json()
    story_id = data.get("story_id")
    scene_id = data.get("scene_id")
    image = data.get("image")
    if not story_id or not scene_id or not image:
        raise HTTPException(status_code=400, detail="story_id, scene_id, and image are required")
    image_bytes = base64.b64decode(extract_base64_from_data_url(image))
    data_dir = Path(os.getenv("DATA_DIR", "/story")) / \
            story_id
    image_dir = data_dir / "images"
    image_dir.mkdir(parents=True, exist_ok=True)
    image_path = image_dir / f"{scene_id}.png"
    if image_path.exists():
        os.remove(image_path)
    with open(image_path, "wb") as img_file:
        img_file.write(image_bytes)
    print(f"Image saved to {image_path}")
    return {"success": True, "filename": f"{scene_id}.png"}

@app.post("/generate/image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    """
    Generate an image from a visual prompt

    Args:
        request: ImageGenerationRequest containing visual prompt and settings

    Returns:
        GenerationResponse with image file information
    """
    try:
        if not request.visual_prompt:
            raise HTTPException(
                status_code=400, detail="Visual prompt is required")
        if not request.story_id:
            raise HTTPException(
                status_code=400, detail="story_id is required")
        if not request.scene_id:
            raise HTTPException(
                status_code=400, detail="scene_id is required")

        result = generate_scene_image(
            story_id=request.story_id,
            scene_id=request.scene_id,
            visual_prompt=request.visual_prompt,
            model=request.model,
            width=request.width,
            height=request.height,
            negative_prompt=request.negative_prompt,
            reference_scene_id=request.reference_scene_id
        )

        return ImageGenerationResponse(
            success=True,
            image=result
        )

    except Exception as e:
        print(f"Image generation failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Image generation failed: {str(e)}")

@app.post("/generate/audio", response_model=AudioGenerationResponse)
async def generate_audio(request: AudioGenerationRequest):
    """
    Generate audio from text input

    Args:
        request: AudioGenerationRequest containing text and voice settings

    Returns:
        AudioGenerationResponse with audio file information
    """
    try:
        # Placeholder logic for audio generation
        # In a real implementation, you would integrate with TTS services

        if not request.text:
            raise HTTPException(
                status_code=400, detail="Text input is required")

        data_dir = Path(os.getenv("DATA_DIR", "/story")) / \
            request.story_id / "audios"
        # Simulate audio generation process
        file_path = data_dir / f"{request.scene_id}.mp3"

        filename, duration = generate_tts(request.text,
                     file_path,
                     voice=request.voice_settings.get("voice", "coral"),
                     instruction=request.voice_settings.get("instruction", "")
                     )

        return AudioGenerationResponse(
            success=True,
            audio_url=f"http://localhost:8000/files/{request.story_id}/audios/{request.scene_id}.mp3",
            duration=duration
        )

    except Exception as e:
        print(f"Audio generation failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Audio generation failed: {str(e)}")

@app.post("/generate/video", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    """
    Generate video from script and optional audio

    Args:
        request: VideoGenerationRequest containing script and video settings

    Returns:
        VideoGenerationResponse with video file information
    """
    try:
        # Placeholder logic for video generation
        # In a real implementation, you would integrate with video generation services
    
        if not request.story_id:
            raise HTTPException(
                status_code=400, detail="story_id is required")
        if not request.scene_id:
            raise HTTPException(
                status_code=400, detail="scene_id is required")

        data_dir = Path(os.getenv("DATA_DIR", "/story")) / \
            request.story_id

        image_path = data_dir / "images" / f"{request.scene_id}.png"
        video_path = data_dir / "videos" / f"{request.scene_id}.mp4"
        audio_path = data_dir / "audios" / f"{request.scene_id}.mp3"
        print(f"Audio path is {audio_path}, exists: {audio_path.exists()}")
        print(f"Video will be saved to {video_path}")
        if request.animation_type == 'single-frame':
            create_video_with_ffmpeg(
                image_path=str(image_path),
                audio_path=str(audio_path),
                animation_str=request.animation,
                output_path=str(video_path)
            )
            print(f"single-frame video generation process completed.")
        else:
            frame_images = [frame.uploadedImageData for frame in request.frames if frame.uploadedImageData]
            if not frame_images:
                raise HTTPException(
                    status_code=400, detail="At least one frame image is required for multi-frame animation")
            create_video_with_ffmpeg_multi_frame(
                scene_id=request.scene_id,
                image_path=str(image_path),
                frame_images=frame_images,
                audio_path=str(audio_path),
                ffmpeg_command=request.ffmpeg_command,
                output_path=str(video_path)
            )
            print(f"multi-frame video generation process completed.")

        return VideoGenerationResponse(
            success=True,
            video_url=f"http://localhost:8000/files/{request.story_id}/videos/{request.scene_id}.mp4"
        )
    except Exception as e:
        print(f"Video generation failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Video generation failed: {str(e)}")

@app.post("/generate/visual/prompt", response_model=VisualPromptResponse)
async def generate_visual_prompt(request: VisualPromptGenerationRequest):
    """
    Generate a visual prompt from a story snippet
    """
    visual_prompt = generate_text(
        prompt=request.text,
        reference=request.previous_reference
    )
    return VisualPromptResponse(
        success=True,
        visual_prompt=visual_prompt
    )

@app.post("/accumulate", response_model=None)
async def accumulate(request: AccumulateRequest):
    """
    Accumulate multiple items/data and return the merged video as a file download.

    Args:
        request: AccumulateRequest containing scenes to accumulate

    Returns:
        FileResponse with the merged video file
    """
    try:
        if not request.story_id:
            raise HTTPException(status_code=400, detail="story_id is required")
        if not request.scenes or not isinstance(request.scenes, list):
            raise HTTPException(
                status_code=400, detail="scenes must be a non-empty list")
        data_dir = Path(os.getenv("DATA_DIR", "/story")) / request.story_id
        video_paths = []
        for scene_id in request.scenes:
            video_file = data_dir / "videos" / f"{scene_id}.mp4"
            if not video_file.exists():
                raise HTTPException(
                    status_code=404, detail=f"Video file not found for scene_id: {scene_id}")
            video_paths.append(str(video_file))
        output_path = data_dir / "story.mp4"
        # Delete the output file if it exists
        if output_path.exists():
            output_path.unlink()
        merge_videos(video_paths, str(output_path))

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Merged video file not found after processing.")

        return FileResponse(
            path=str(output_path),
            media_type="video/mp4",
            filename="story.mp4",
            headers={
                "X-Debug-Story-Id": request.story_id,
                "X-Debug-Scenes": ",".join(request.scenes),
                "X-Debug-File-Path": str(output_path)
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Accumulation failed: {str(e)}")

@app.post("/init", response_model=GenerationResponse)
async def init_story(request: InitRequest):
    """
    Initialize a story processing session

    Args:
        request: InitRequest containing story_id

    Returns:
        GenerationResponse with initialization status
    """
    try:
        if not request.story_id:
            raise HTTPException(status_code=400, detail="story_id is required")

        data_dir = Path(os.getenv("DATA_DIR", "/story")) / request.story_id
        data_dir.mkdir(parents=True, exist_ok=True)

        images_dir = data_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)

        audio_dir = data_dir / "audios"
        audio_dir.mkdir(parents=True, exist_ok=True)

        video_dir = data_dir / "videos"
        video_dir.mkdir(parents=True, exist_ok=True)

        return GenerationResponse(
            success=True,
            message=f"Story '{request.story_id}' initialized successfully"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Story initialization failed: {str(e)}")

@app.post("/generate/audio/mix")
async def mix_audio(request: Request):
    """
    Mix base audio with overlay tracks
    Handles dynamic form field names: overlay_file_0, overlay_file_1, etc.
    and track_config_0, track_config_1, etc.
    """
    try:
        form_data = await request.form()
        
        # Get metadata
        metadata_str = form_data.get("metadata")
        if not metadata_str:
            raise HTTPException(status_code=400, detail="metadata is required")
        
        meta = json.loads(metadata_str)
        print(f"Mixing audio for story_id: {meta.get('story_id')}")
        
        story_id = meta.get("story_id")
        if not story_id:
            raise HTTPException(status_code=400, detail="story_id is required in metadata")
        
        scene_id = meta.get("scene_id")
        if not scene_id:
            raise HTTPException(status_code=400, detail="scene_id is required in metadata")

        # Get base audio info
        output_format = meta.get("output_format", "mp3")
        normalize = meta.get("normalize", True)
        export_quality = meta.get("export_quality", "high")

        data_dir = Path(os.getenv("DATA_DIR", "/story")) / story_id
        audio_dir = data_dir / "audios"
        audio_dir.mkdir(parents=True, exist_ok=True)

        audio_file = audio_dir / f"{scene_id}.mp3"

        # Extract overlay files and configs by matching field name patterns
        overlay_files = {}
        track_configs = {}
        
        for field_name, field_value in form_data.items():
            if field_name.startswith("overlay_file_"):
                index = field_name.split("_")[-1]  # Get index from overlay_file_0, overlay_file_1, etc.
                overlay_files[index] = field_value
            elif field_name.startswith("track_config_"):
                index = field_name.split("_")[-1]  # Get index from track_config_0, track_config_1, etc.
                track_configs[index] = field_value
        
        # Process uploaded overlay files and their configs
        processed_tracks = []
        
        for index in sorted(overlay_files.keys()):
            if index in track_configs:
                file = overlay_files[index]
                config_str = track_configs[index]
                config = json.loads(config_str)
                
                print(f"Processing file: {file.filename} with config: {config}")
                
                # Save the uploaded file temporarily
                file_path = audio_dir / f"overlay_{scene_id}_{index}_{file.filename}"
                audio_data = await file.read()
                with open(file_path, "wb") as f:
                    f.write(audio_data)
                
                processed_tracks.append({
                    "file_path": str(file_path),
                    "config": config,
                    "index": index
                })
        output_file = str(audio_dir / f"{scene_id}_mixed.{output_format}")
        # Delete the output file if it exists
        if os.path.exists(output_file):
            os.remove(output_file)
        mix_audio_tracks(base_audio=str(audio_file),
                  processed_tracks=processed_tracks,
                  output_file=output_file,
                  normalize=normalize,
                  export_format=output_format)

        print(f"Successfully processed {len(processed_tracks)} overlay tracks")
        print(f"Mixed audio saved to: {output_file}")
        return {
            "success": True,
            "mixed_audio_url": f"http://localhost:8000/files/{story_id}/audios/{scene_id}_mixed.{output_format}"
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in metadata or track config: {str(e)}")
    except Exception as e:
        print(f"Audio mixing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audio mixing failed: {str(e)}")
        
@app.post("/generate/audio/accept")
async def accept_mixed_audio(request: Request):
    """Accept mixed audio and finalize changes"""
    try:
        data = await request.json()
        story_id = data.get("story_id")
        scene_id = data.get("scene_id")

        if not story_id or not scene_id:
            raise HTTPException(status_code=400, detail="story_id and scene_id are required")
        data_dir = Path(os.getenv("DATA_DIR", "/story")) / story_id
        audio_dir = data_dir / "audios"
        audio_dir.mkdir(parents=True, exist_ok=True)
        mixed_audio_file = audio_dir / f"{scene_id}_mixed.mp3"
        if not mixed_audio_file.exists():
            raise HTTPException(status_code=404, detail="Mixed audio file not found")
        final_audio_file = audio_dir / f"{scene_id}.mp3"
        if final_audio_file.exists():
            final_audio_file.unlink()
        mixed_audio_file.rename(final_audio_file)
        # Simulate acceptance process
        print(f"Accepting mixed audio for Story ID: {story_id}, Scene ID: {scene_id}")
        return {"success": True}

    except Exception as e:
        print(f"Error accepting mixed audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error accepting mixed audio: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "story-to-video-server"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
