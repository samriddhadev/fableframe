from openai import OpenAI
import traceback
import json
import subprocess
from pydub import AudioSegment

client = OpenAI()

def generate_tts(text: str, filename: str, voice: str = 'coral', instruction: str = "") -> dict:
    try:
        """Generate narration audio from text using OpenAI TTS and return file path and duration."""
        speech = client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice=voice,
            input=text,
            instructions=instruction
        )
        with open(filename, "wb") as f:
            f.write(speech.read())
        print(f"TTS audio saved to {filename}")
        duration = get_audio_duration(filename)
        print(f"Audio duration: {duration} seconds")
    except Exception as e:
        traceback.print_exception(e)
        print(f"Error generating TTS: {e}")
        raise e

    return filename, duration


def get_audio_duration(filename):
    """
    Returns duration of an audio file in seconds using ffprobe.
    Requires ffprobe (part of ffmpeg) installed and in PATH.
    """
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "json",
            filename
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        info = json.loads(result.stdout)
        duration = float(info["format"]["duration"])
        return duration
    except Exception as e:
        print(f"Could not determine duration for {filename}: {e}")
        return None
    
def mix_audio_tracks(base_audio, processed_tracks, output_file, normalize=True, export_format="mp3"):
    """
    Mix base audio with processed overlay tracks using pydub.
    processed_tracks is a list of dicts with keys: file_path, config
    config contains: start_time_ms, volume_db, fade_in_ms, fade_out_ms, loop
    """
    try:
        main_audio = AudioSegment.from_file(base_audio)
        print(f"Base audio duration: {main_audio.duration_seconds} seconds")
        
        for track in processed_tracks:
            print(f"Processing overlay track: {track['file_path']} with config: {track['config']}")
            overlay = AudioSegment.from_file(track['file_path'])
            config = track['config']
            
            # Loop the overlay if needed
            if config.get('loop', False):
                loops = int(main_audio.duration_seconds // overlay.duration_seconds) + 1
                overlay = overlay * loops
                print(f"Looped overlay to duration: {overlay.duration_seconds} seconds")
            
            # Apply fade effects
            if config.get('fade_in_ms', 0) > 0:
                overlay = overlay.fade_in(config['fade_in_ms'])
                print(f"Applied fade-in to overlay: {overlay.duration_seconds} seconds")
            if config.get('fade_out_ms', 0) > 0:
                overlay = overlay.fade_out(config['fade_out_ms'])
                print(f"Applied fade-out to overlay: {overlay.duration_seconds} seconds")
            
            # Adjust volume
            if config.get('volume_db', 0) != 0:
                overlay = overlay + config['volume_db']
                print(f"Adjusted overlay volume by {config['volume_db']} dB")
            elif config.get('volume', 0) != 0:  # Fallback for 'volume' key
                overlay = overlay + config['volume']
                print(f"Adjusted overlay volume by {config['volume']} dB")
            
            # Overlay the track
            start_time = config.get('start_time_ms', 0)
            main_audio = main_audio.overlay(overlay, position=start_time)
            print(f"Overlayed track at {start_time} ms")
        
        # Normalize audio if requested
        if normalize:
            main_audio = main_audio.normalize()
            print("Applied audio normalization")
        
        # Export with proper format
        main_audio.export(output_file, format=export_format)
        print(f"Mixed audio saved to {output_file}")
        
    except Exception as e:
        print(f"Error mixing audio: {e}")
        raise e