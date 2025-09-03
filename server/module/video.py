import os
import base64
import shutil
import tempfile
import subprocess
import json

from module.util import extract_base64_from_data_url


def create_video_with_ffmpeg_multi_frame(scene_id: str, image_path, frame_images: list[str], audio_path, ffmpeg_command, output_path):
    with tempfile.TemporaryDirectory() as tmpdir:
        frame_images = [extract_base64_from_data_url(img) for img in frame_images]
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
            raise FileNotFoundError(f"Expected output file {multiframe_path} was not created by ffmpeg")


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
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-shortest",
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
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-shortest",
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

    # Write concat list
    with open("video_list.txt", "w", encoding="utf-8") as f:
        for v in fixed_paths:
            f.write(f"file '{v.replace(os.sep, '/')}'\n")

    # Lossless concat
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", "video_list.txt",
        "-c", "copy",
        output_path
    ], check=True)

    os.remove("video_list.txt")
    # Clean only the intermediate normalized files
    for i, v in enumerate(video_paths):
        fixed = f"fixed_{i}.mp4"
        if os.path.exists(fixed):
            os.remove(fixed)
    print(f"🎉 Merged video saved to {output_path}")