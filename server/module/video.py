import os
import base64
import shutil
import tempfile
import subprocess
import json

from module.util import extract_base64_from_data_url


def create_video_with_ffmpeg_multi_frame(scene_id: str, image_path, frame_images: list[str], audio_path, ffmpeg_command, output_path):
    with tempfile.TemporaryDirectory() as tmpdir:
        frame_images = [extract_base64_from_data_url(
            img) for img in frame_images]
        for idx, img_data in enumerate(frame_images):
            img_path = os.path.join(tmpdir, f"frame_{scene_id}_{idx+1}.png")
            with open(img_path, "wb") as img_file:
                img_file.write(base64.b64decode(img_data))
        shutil.copy(image_path, os.path.join(tmpdir, f"{scene_id}.png"))
        shutil.copy(audio_path, os.path.join(tmpdir, f"{scene_id}.mp3"))
        print(f"Executing ffmpeg command: {ffmpeg_command} in {tmpdir}")
        subprocess.run(ffmpeg_command, shell=True, check=True, cwd=tmpdir)
        multiframe_path = os.path.join(tmpdir, f"{scene_id}_multiframe.mp4")
        if os.path.exists(multiframe_path):
            os.rename(multiframe_path, os.path.join(tmpdir, f"{scene_id}.mp4"))
            shutil.move(os.path.join(tmpdir, f"{scene_id}.mp4"), output_path)
        else:
            raise FileNotFoundError(
                f"Expected output file {multiframe_path} was not created by ffmpeg")


def create_video_with_ffmpeg(image_path, audio_path, animation_str, output_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    if animation_str:
        # If an animation string is provided, use it in the ffmpeg command
        command = [
            "ffmpeg",
            "-y",
            "-loop", "1",
            "-i", image_path,
            "-i", audio_path,
            "-vf", animation_str,
            "-c:v", "libx264",
            "-preset", "veryfast",        # replaces -tune stillimage
            "-profile:v", "high",
            "-level", "4.0",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",    # crucial for browser playback
            output_path
        ]

    else:
        # Default command without animation
        command = [
            "ffmpeg",
            "-y",
            "-loop", "1",
            "-i", image_path,
            "-i", audio_path,
            "-c:v", "libx264",
            "-preset", "veryfast",     # safer than -tune stillimage
            "-profile:v", "high",
            "-level", "4.0",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",  # enables streaming in browsers
            output_path
        ]

    print(f"Running ffmpeg command: {' '.join(command)}")
    subprocess.run(command, check=True)


def needs_normalization(video_path):
    """Check if the video has mismatched audio/video settings."""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,channels,sample_rate",
        "-of", "json",
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    info = json.loads(result.stdout)

    # Default: assume needs normalization if no audio stream
    if not info.get("streams"):
        return True

    stream = info["streams"][0]
    codec = stream.get("codec_name", "")
    channels = int(stream.get("channels", 0))
    sample_rate = int(stream.get("sample_rate", 0))

    # Must be AAC, stereo, 48kHz
    if codec != "aac" or channels != 2 or sample_rate != 48000:
        return True

    return False


def normalize_video(input_path, output_path):
    subprocess.run([
        "ffmpeg", "-y", "-i", input_path,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        output_path
    ], check=True)


def get_video_audio_duration(video_path):
    """Get the duration of video and audio streams in a video file."""
    # Get video duration
    cmd_video = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=duration",
        "-of", "json",
        video_path
    ]
    result_video = subprocess.run(cmd_video, capture_output=True, text=True, check=True)
    video_info = json.loads(result_video.stdout)
    video_duration = float(video_info.get("streams", [{"duration": "0"}])[0].get("duration", 0))

    # Get audio duration
    cmd_audio = [
        "ffprobe", "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=duration",
        "-of", "json",
        video_path
    ]
    result_audio = subprocess.run(cmd_audio, capture_output=True, text=True, check=True)
    audio_info = json.loads(result_audio.stdout)
    audio_duration = float(audio_info.get("streams", [{"duration": "0"}])[0].get("duration", 0))

    return {
        "video_duration": video_duration,
        "audio_duration": audio_duration
    }


def merge_videos(video_paths, output_path):
    fixed_paths = []
    for i, v in enumerate(video_paths):
        if needs_normalization(v):
            fixed = f"fixed_{i}.mp4"
            print(f"🔧 Normalizing {v} → {fixed}")
            normalize_video(v, fixed)
            fixed_paths.append(os.path.abspath(fixed))
        else:
            print(f"✅ Skipping normalization: {v}")
            fixed_paths.append(os.path.abspath(v))

    # Create temporary directory for processed videos
    temp_dir = tempfile.mkdtemp()
    try:
        processed_files = []
        
        # Process each video to ensure audio completion
        for i, video_path in enumerate(fixed_paths):
            # Get duration of the video and audio
            video_info = get_video_audio_duration(video_path)
            max_duration = max(video_info['video_duration'], video_info['audio_duration'])
            
            # Process the video to ensure it plays for the full duration of its audio
            processed_file = os.path.join(temp_dir, f"processed_{i}.mp4")
            print(f"🔄 Ensuring audio completion for video {i+1}/{len(fixed_paths)}")
            
            subprocess.run([
                "ffmpeg", "-y",
                "-i", video_path,
                "-c:v", "libx264", "-preset", "fast",
                "-c:a", "aac",
                "-t", str(max_duration),  # Set the duration to match the longest stream
                processed_file
            ], check=True)
            
            processed_files.append(processed_file)
        
        # Write concat list
        concat_list_path = os.path.join(temp_dir, "video_list.txt")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for v in processed_files:
                f.write(f"file '{v.replace(os.sep, '/')}'\n")
        
        # Concat with re-encoding to ensure smooth transitions
        subprocess.run([
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_list_path,
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            output_path
        ], check=True)
        
        print(f"🎉 Merged video saved to {output_path}")
        
    finally:
        # Clean up temporary directory and files
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        # Clean only the intermediate normalized files
        for i, v in enumerate(video_paths):
            fixed = f"fixed_{i}.mp4"
            if os.path.exists(fixed):
                os.remove(fixed)
