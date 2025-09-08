import subprocess
import json
import os
import tempfile
from pathlib import Path
from pydub import AudioSegment
from pydub.effects import normalize, compress_dynamic_range
from pydub.playback import play
import traceback

def enhance_audio(audio_file_path: str, output_path: str, settings: dict) -> str:
    """
    Enhance audio file with various processing options using pydub and ffmpeg.
    
    Args:
        audio_file_path: Path to input audio file
        output_path: Path for output enhanced audio file  
        settings: Dictionary containing enhancement settings
        
    Returns:
        Path to enhanced audio file
    """
    try:
        print(f"Loading audio file: {audio_file_path}")
        audio = AudioSegment.from_file(audio_file_path)
        
        # Apply volume adjustment
        if settings.get('volume', 0) != 0:
            volume_db = settings['volume']
            audio = audio + volume_db
            print(f"Applied volume adjustment: {volume_db}dB")
        
        # Apply normalization
        if settings.get('normalize', False):
            audio = normalize(audio)
            print("Applied audio normalization")
        
        # Apply dynamic range compression
        if settings.get('compress', False):
            audio = compress_dynamic_range(audio, threshold=-20.0, ratio=4.0, attack=5.0, release=50.0)
            print("Applied dynamic range compression")
        
        # Apply fade effects
        fade_in = settings.get('fadeIn', 0)
        fade_out = settings.get('fadeOut', 0)
        
        if fade_in > 0:
            audio = audio.fade_in(fade_in)
            print(f"Applied fade-in: {fade_in}ms")
            
        if fade_out > 0:
            audio = audio.fade_out(fade_out)
            print(f"Applied fade-out: {fade_out}ms")
        
        # Export to temporary file for ffmpeg processing
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        audio.export(temp_file.name, format='wav')
        
        # Build ffmpeg command for advanced processing
        ffmpeg_filters = []
        
        # EQ adjustments
        bass_boost = settings.get('bassBoost', 0)
        mid_boost = settings.get('midBoost', 0)
        treble_boost = settings.get('trebleBoost', 0)
        
        if bass_boost != 0 or mid_boost != 0 or treble_boost != 0:
            # Create equalizer filter
            eq_filter = f"equalizer=f=100:width_type=o:width=2:g={bass_boost}," + \
                       f"equalizer=f=1000:width_type=o:width=2:g={mid_boost}," + \
                       f"equalizer=f=10000:width_type=o:width=2:g={treble_boost}"
            ffmpeg_filters.append(eq_filter)
            print(f"Added EQ filter - Bass: {bass_boost}dB, Mid: {mid_boost}dB, Treble: {treble_boost}dB")
        
        # Noise reduction and gating
        if settings.get('noiseReduction', False):
            ffmpeg_filters.append("afftdn=nf=-25")
            print("Added noise reduction filter")
        
        if settings.get('noiseGate', False):
            gate_threshold = settings.get('gateThreshold', -40)
            gate_filter = f"agate=threshold={gate_threshold}dB:ratio=2:attack=3:release=8"
            ffmpeg_filters.append(gate_filter)
            print(f"Added noise gate filter - Threshold: {gate_threshold}dB")
        
        # Reverb effect
        if settings.get('reverb', False):
            reverb_amount = settings.get('reverbAmount', 0.2)
            # Create a simple reverb using delays
            reverb_filter = f"aecho=0.8:0.9:{int(50 * reverb_amount)}:{reverb_amount}"
            ffmpeg_filters.append(reverb_filter)
            print(f"Added reverb effect - Amount: {reverb_amount}")
        
        # Echo effect
        if settings.get('echo', False):
            echo_delay = settings.get('echoDelay', 500)
            echo_decay = settings.get('echoDecay', 0.3)
            echo_filter = f"aecho={echo_decay}:0.9:{echo_delay}:{echo_decay}"
            ffmpeg_filters.append(echo_filter)
            print(f"Added echo effect - Delay: {echo_delay}ms, Decay: {echo_decay}")
        
        # Stereo widening
        if settings.get('stereoWiden', False):
            ffmpeg_filters.append("extrastereo=m=2.5:c=false")
            print("Added stereo widening effect")
        
        # Apply ffmpeg filters if any exist
        if ffmpeg_filters:
            filter_complex = ",".join(ffmpeg_filters)
            
            cmd = [
                "ffmpeg",
                "-i", temp_file.name,
                "-af", filter_complex,
                "-acodec", "libmp3lame",
                "-ab", "192k",
                "-ar", "44100",
                "-y",  # Overwrite output files
                output_path
            ]
            
            print(f"Running ffmpeg command: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print("FFmpeg processing completed successfully")
            
        else:
            # No ffmpeg filters needed, just export the pydub processed audio
            audio.export(output_path, format='mp3', bitrate='192k')
            print("Exported audio using pydub only")
        
        # Clean up temporary file
        os.unlink(temp_file.name)
        
        print(f"Enhanced audio saved to: {output_path}")
        return output_path
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e}")
        print(f"FFmpeg stderr: {e.stderr}")
        # Fallback to pydub-only processing
        try:
            audio.export(output_path, format='mp3', bitrate='192k')
            print("Fallback: Exported using pydub only")
            return output_path
        except Exception as fallback_error:
            print(f"Fallback export failed: {fallback_error}")
            raise fallback_error
            
    except Exception as e:
        print(f"Error enhancing audio: {e}")
        traceback.print_exc()
        raise e

def get_audio_analysis(audio_file_path: str) -> dict:
    """
    Analyze audio file properties for enhancement recommendations.
    
    Args:
        audio_file_path: Path to audio file
        
    Returns:
        Dictionary with audio analysis results
    """
    try:
        audio = AudioSegment.from_file(audio_file_path)
        
        # Basic properties
        analysis = {
            'duration_seconds': len(audio) / 1000.0,
            'sample_rate': audio.frame_rate,
            'channels': audio.channels,
            'frame_count': audio.frame_count(),
            'frame_width': audio.frame_width,
        }
        
        # Calculate RMS (approximate loudness)
        rms = audio.rms
        analysis['rms'] = rms
        analysis['db_level'] = 20 * (rms / audio.max_possible_amplitude) if rms > 0 else -float('inf')
        
        # Detect if audio is too quiet or too loud
        if analysis['db_level'] < -30:
            analysis['recommendations'] = ['volume_boost', 'normalize']
        elif analysis['db_level'] > -6:
            analysis['recommendations'] = ['volume_reduce', 'compress']
        else:
            analysis['recommendations'] = ['normalize']
        
        # Check for mono vs stereo
        if audio.channels == 1:
            analysis['recommendations'].append('stereo_conversion')
        
        print(f"Audio analysis completed: {analysis}")
        return analysis
        
    except Exception as e:
        print(f"Error analyzing audio: {e}")
        return {
            'error': str(e),
            'recommendations': []
        }

def create_audio_preview(audio_file_path: str, start_time_ms: int = 0, duration_ms: int = 30000) -> str:
    """
    Create a preview clip of audio file for quick testing.
    
    Args:
        audio_file_path: Path to audio file
        start_time_ms: Start time in milliseconds
        duration_ms: Duration of preview in milliseconds
        
    Returns:
        Path to preview audio file
    """
    try:
        audio = AudioSegment.from_file(audio_file_path)
        
        # Extract preview segment
        end_time = min(start_time_ms + duration_ms, len(audio))
        preview = audio[start_time_ms:end_time]
        
        # Create preview filename
        base_path = Path(audio_file_path)
        preview_path = base_path.parent / f"preview_{base_path.stem}.mp3"
        
        # Export preview
        preview.export(str(preview_path), format='mp3', bitrate='128k')
        
        print(f"Created audio preview: {preview_path}")
        return str(preview_path)
        
    except Exception as e:
        print(f"Error creating audio preview: {e}")
        raise e
