import os
import subprocess

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

def merge_videos(video_paths, output_path):
    with open("video_list.txt", "w") as f:
        for video in video_paths:
            f.write(f"file '{video}'\n")
    try:
        subprocess.run([
            "ffmpeg",
            "-f", "concat",
            "-safe", "0",
            "-i", "video_list.txt",
            "-c:v", "libx264",   # re-encode video
            "-crf", "23",        # quality
            "-preset", "fast",
            "-c:a", "aac",       # audio codec
            "-b:a", "192k",
            output_path
        ], check=True)
        print("Video concatenation successful!")
    except subprocess.CalledProcessError as e:
        print("FFmpeg failed with exit code:", e.returncode)
    finally:
        os.remove("video_list.txt")