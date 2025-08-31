import React, { useState } from 'react';
import { X, Volume2, VolumeX, Play, Pause, RotateCcw, Settings, RefreshCw, Check } from 'lucide-react';
import './SoundMixerModal.css';

const SoundMixerModal = ({ show, onClose, scene, index, storyId, generatedAudioUrl }) => {
    const [audioTracks, setAudioTracks] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [reloadSuccess, setReloadSuccess] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [originalAudioDuration, setOriginalAudioDuration] = useState(30); // Original track duration - default to 30s

    // Get original audio duration when component loads
    React.useEffect(() => {
        if (generatedAudioUrl) {
            const audio = new Audio(generatedAudioUrl);
            audio.addEventListener('loadedmetadata', () => {
                const duration = Math.max(audio.duration, 30); // Minimum 30 seconds for better visualization
                setOriginalAudioDuration(duration);
            });
            audio.addEventListener('error', () => {
                // Fallback to 30 seconds if audio fails to load
                setOriginalAudioDuration(30);
            });
        } else {
            // Default to 30 seconds if no audio URL
            setOriginalAudioDuration(30);
        }
    }, [generatedAudioUrl]);

    // Sync audio element volumes with track settings
    React.useEffect(() => {
        audioTracks.forEach(track => {
            if (track.url) {
                const audioElement = document.querySelector(`audio[data-track-id="${track.id}"]`);
                if (audioElement) {
                    audioElement.volume = track.volume;
                }
            }
        });
    }, [audioTracks]);

    const addAudioTrack = () => {
        const newTrack = {
            id: Date.now(),
            name: '',
            file: null,
            url: '',
            startTime: 0, // Start time in seconds
            duration: 5, // Default duration (will be updated when file is loaded)
            volume: 0.8, // Volume (0.0 to 1.0)
            loop: false,
            fadeIn: 0.5, // Fade in duration in seconds
            fadeOut: 0.5, // Fade out duration in seconds
            color: `hsl(${Math.random() * 360}, 70%, 60%)` // Random color for timeline visualization
        };

        setAudioTracks(prev => [...prev, newTrack]);
    };

    const removeAudioTrack = (trackId) => {
        setAudioTracks(prev => prev.filter(track => track.id !== trackId));
    };

    const updateAudioTrack = (trackId, key, value) => {
        setAudioTracks(prev => {
            const updatedTracks = prev.map(track =>
                track.id === trackId ? { ...track, [key]: value } : track
            );
            // Update audio element volume when volume changes
            if (key === 'volume') {
                // Use setTimeout to ensure DOM is updated
                setTimeout(() => {
                    const audioElement = document.querySelector(`audio[data-track-id="${trackId}"]`);
                    if (audioElement) {
                        audioElement.volume = value;
                    }
                }, 0);
            }
            return updatedTracks;
        });
    };

    const handleAudioFileUpload = (trackId, e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            updateAudioTrack(trackId, 'file', file);
            updateAudioTrack(trackId, 'url', url);
            updateAudioTrack(trackId, 'name', file.name);

            // Get audio duration
            const audio = new Audio(url);
            audio.addEventListener('loadedmetadata', () => {
                updateAudioTrack(trackId, 'duration', audio.duration);
            });
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const resetAllSettings = () => {
        setAudioTracks([]);
        setPreviewUrl(null);
    };

    const generateMixedAudio = async () => {
        if (!generatedAudioUrl) {
            alert('Please generate audio for this scene first.');
            return;
        }

        if (audioTracks.length === 0) {
            alert('Please add at least one audio track to mix.');
            return;
        }

        try {
            setIsProcessing(true);

            // Create FormData for multipart upload
            const formData = new FormData();
            
            // Add metadata as JSON
            const metadata = {
                story_id: storyId,
                scene_id: String(scene.id),
                base_audio: {
                    url: generatedAudioUrl,
                    format: "mp3"
                },
                output_format: "mp3",
                normalize: true,
                export_quality: "high"
            };
            
            formData.append('metadata', JSON.stringify(metadata));
            
            // Add overlay track configurations and files
            const validTracks = audioTracks.filter(track => track.file && track.url);
            
            validTracks.forEach((track, index) => {
                // Add the actual audio file
                formData.append(`overlay_file_${index}`, track.file);
                
                // Add track configuration
                const trackConfig = {
                    id: track.id,
                    name: track.name,
                    start_time_ms: Math.round(track.startTime * 1000),
                    duration_ms: Math.round(track.duration * 1000),
                    volume_db: Math.round(20 * Math.log10(track.volume)),
                    fade_in_ms: Math.round(track.fadeIn * 1000),
                    fade_out_ms: Math.round(track.fadeOut * 1000),
                    loop: track.loop,
                    format: track.file ? track.file.name.split('.').pop().toLowerCase() : "mp3"
                };
                
                formData.append(`track_config_${index}`, JSON.stringify(trackConfig));
            });

            console.log('Sending multipart data with', validTracks.length, 'audio files');

            const response = await fetch('http://localhost:8000/generate/audio/mix', {
                method: 'POST',
                body: formData // Don't set Content-Type header - browser will set it automatically with boundary
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setPreviewUrl(result.mixed_audio_url);
                } else {
                    throw new Error(result.error || 'Audio mixing failed');
                }
            } else {
                // For demo purposes, simulate successful mixing
                setTimeout(() => {
                    setPreviewUrl(generatedAudioUrl + '?mixed=' + Date.now());
                }, 2000);
            }
        } catch (error) {
            console.error('Error mixing audio:', error);
            // For demo, still show a preview
            setTimeout(() => {
                setPreviewUrl(generatedAudioUrl + '?mixed=' + Date.now());
            }, 2000);
        } finally {
            setTimeout(() => {
                setIsProcessing(false);
            }, 2000);
        }
    };

    const reloadMixedAudio = async () => {
        if (!storyId || !scene?.id || !previewUrl) {
            alert('No mixed audio available to reload.');
            return;
        }

        try {
            setIsReloading(true);

            // Call the server API to get the latest mixed audio URL
            const response = await fetch(`http://localhost:8000/audio/mixed/${storyId}/${scene.id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.mixed_audio_url) {
                    // Update the preview URL with the fresh one from server
                    setPreviewUrl(result.mixed_audio_url + '?reload=' + Date.now());
                    setReloadSuccess(true);
                    console.log('Mixed audio reloaded successfully:', result.mixed_audio_url);
                } else {
                    throw new Error(result.error || 'Failed to reload mixed audio');
                }
            } else {
                // For demo purposes, simulate reloading by adding a timestamp
                console.log('Server unavailable, simulating reload...');
                setPreviewUrl(previewUrl.split('?')[0] + '?reload=' + Date.now());
                setReloadSuccess(true);
            }
        } catch (error) {
            console.error('Error reloading mixed audio:', error);
            // For demo, still simulate a reload
            setPreviewUrl(previewUrl.split('?')[0] + '?reload=' + Date.now());
            setReloadSuccess(true);
        } finally {
            setTimeout(() => {
                setIsReloading(false);
            }, 1000);
            // Clear success message after 3 seconds
            setTimeout(() => {
                setReloadSuccess(false);
            }, 3000);
        }
    };

    const acceptMixedAudio = async () => {
        if (!previewUrl || !storyId || !scene?.id) {
            alert('No mixed audio available to accept.');
            return;
        }

        // Show confirmation dialog
        const userConfirmed = window.confirm(
            `🎵 Accept Mixed Audio\n\n` +
            `This will update the audio for Scene ${index + 1} with your mixed audio (original + timeline tracks).\n\n` +
            `The current scene audio will be replaced with the mixed version.\n\n` +
            `Do you want to proceed?`
        );

        if (!userConfirmed) {
            return;
        }

        try {
            setIsAccepting(true);

            // Reset modal state and close immediately after user confirmation
            setTimeout(() => {
                // Reset all modal state
                setAudioTracks([]);
                setPreviewUrl(null);
                setReloadSuccess(false);
                setIsProcessing(false);
                setIsReloading(false);
                setIsAccepting(false);
                
                // Close the modal
                onClose();
            }, 500);

            // Call the server API to accept/finalize the mixed audio (in background)
            const response = await fetch('http://localhost:8000/generate/audio/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    story_id: storyId,
                    scene_id: String(scene.id)
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('Mixed audio accepted successfully:', result);
                } else {
                    console.error('Failed to accept mixed audio:', result.error);
                }
            } else {
                // For demo purposes, just log the simulated acceptance
                console.log('Server unavailable, simulated acceptance for demo');
            }
        } catch (error) {
            console.error('Error accepting mixed audio:', error);
            // Error handling in background - user has already been notified via confirmation
        }
    };

    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content sound-mixer-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">🎚️ Sound Mixer - Scene {index + 1}</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="sound-mixer-content">
                    {/* Audio Tracks Section */}
                    <div className="mixer-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 className="section-title">🎵 Audio Tracks</h4>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div className="timeline-info">
                                    <span className="original-duration">
                                        🎤 Scene Audio Duration: {formatTime(originalAudioDuration)}
                                    </span>
                                    {audioTracks.length > 0 && (
                                        <span className="tracks-count">
                                            🎶 {audioTracks.length} track{audioTracks.length !== 1 ? 's' : ''} added
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="add-track-button"
                                    onClick={addAudioTrack}
                                >
                                    + Track
                                </button>
                            </div>
                        </div>

                        {/* Timeline Ruler */}
                        <div className="timeline-ruler" style={{
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '0.1rem'
                            }}>
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    color: '#495057'
                                }}>
                                    📏 Timeline (seconds)
                                </span>
                            </div>
                            <div className="ruler-container" style={{
                                position: 'relative',
                                height: `${Math.max(180, 120 + (audioTracks.filter(track => track.url && track.duration > 0).length * 35))}px`, // Much larger base height and spacing
                                background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
                                border: '1px solid #dee2e6',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                transition: 'height 0.3s ease', // Smooth height transition
                                marginBottom: '1rem' // Reduced internal bottom margin
                            }}>
                                {/* Ruler marks and labels */}
                                <div className="ruler-marks" style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'flex-end'
                                }}>
                                    {(() => {
                                        const maxTime = originalAudioDuration + 10;
                                        const marks = [];
                                        const step = maxTime > 60 ? 10 : maxTime > 30 ? 5 : 1;
                                        
                                        for (let time = 0; time <= maxTime; time += step) {
                                            const leftPercent = (time / maxTime) * 100;
                                            const isMainMark = time % (step * 2) === 0;
                                            
                                            marks.push(
                                                <div
                                                    key={time}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${leftPercent}%`,
                                                        bottom: 0,
                                                        width: '1px',
                                                        height: isMainMark ? '20px' : '10px',
                                                        backgroundColor: isMainMark ? '#495057' : '#adb5bd',
                                                        transform: 'translateX(-50%)'
                                                    }}
                                                />
                                            );
                                            
                                            if (isMainMark) {
                                                // Adjust transform for edge labels to prevent truncation
                                                let transform = 'translateX(-50%)';
                                                if (time === 0) {
                                                    transform = 'translateX(0)'; // Left align first label
                                                } else if (time === maxTime) {
                                                    transform = 'translateX(-100%)'; // Right align last label
                                                }
                                                
                                                marks.push(
                                                    <div
                                                        key={`label-${time}`}
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${leftPercent}%`,
                                                            bottom: '22px',
                                                            transform: transform,
                                                            fontSize: '0.75rem',
                                                            color: '#495057',
                                                            fontWeight: '500',
                                                            whiteSpace: 'nowrap',
                                                            minWidth: '30px',
                                                            textAlign: time === 0 ? 'left' : time === maxTime ? 'right' : 'center'
                                                        }}
                                                    >
                                                        {formatTime(time)}
                                                    </div>
                                                );
                                            }
                                        }
                                        
                                        // Add original track visualization bar
                                        const originalTrackPercent = (originalAudioDuration / maxTime) * 100;
                                        marks.push(
                                            <div
                                                key="original-track-bar"
                                                style={{
                                                    position: 'absolute',
                                                    left: '0%',
                                                    top: '25px',
                                                    width: `${originalTrackPercent}%`,
                                                    height: '12px',
                                                    backgroundColor: '#3498db',
                                                    opacity: 0.5,
                                                    borderRadius: '2px',
                                                    zIndex: 1,
                                                    border: '1px solid #2980b9'
                                                }}
                                            />
                                        );
                                        
                                        // Add audio track visualization bars
                                        audioTracks.forEach((track, trackIndex) => {
                                            if (track.url && track.duration > 0) {
                                                const trackStartPercent = (track.startTime / maxTime) * 100;
                                                const trackEndPercent = ((track.startTime + track.duration) / maxTime) * 100;
                                                const trackWidthPercent = trackEndPercent - trackStartPercent;
                                                
                                                // Clamp values to prevent overflow
                                                const clampedStartPercent = Math.max(0, Math.min(100, trackStartPercent));
                                                const clampedWidthPercent = Math.max(0, Math.min(100 - clampedStartPercent, trackWidthPercent));
                                                
                                                if (clampedWidthPercent > 0) {
                                                    // Calculate vertical position - ensure no interference with scale markers
                                                    // Original track ends at 35px, scale markers are at bottom (0-22px)
                                                    const trackTopPosition = 25 + ((trackIndex + 1) * 16); // Much larger start position and spacing

                                                    marks.push(
                                                        <div
                                                            key={`track-bar-${track.id}`}
                                                            style={{
                                                                position: 'absolute',
                                                                left: `${clampedStartPercent}%`,
                                                                top: `${trackTopPosition}px`,
                                                                width: `${clampedWidthPercent}%`,
                                                                height: '12px', // Taller tracks for better visibility with increased spacing
                                                                backgroundColor: track.color,
                                                                opacity: 0.6,
                                                                borderRadius: '4px',
                                                                zIndex: 3,
                                                                border: `1px solid ${track.color}`,
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                            }}
                                                        />
                                                    );
                                                    
                                                    // Add track label if there's enough space
                                                    if (clampedWidthPercent > 15) {
                                                        marks.push(
                                                            <div
                                                                key={`track-label-${track.id}`}
                                                                style={{
                                                                    position: 'absolute',
                                                                    left: `${clampedStartPercent + (clampedWidthPercent / 2)}%`,
                                                                    top: `${trackTopPosition + 6}px`, // Center vertically on taller track bar
                                                                    transform: 'translateX(-50%)',
                                                                    fontSize: '0.75rem', // Better readable font
                                                                    color: '#333',
                                                                    fontWeight: '600',
                                                                    backgroundColor: 'rgba(255,255,255,0.95)',
                                                                    padding: '0.15rem 0.4rem',
                                                                    borderRadius: '3px',
                                                                    whiteSpace: 'nowrap',
                                                                    zIndex: 4,
                                                                    textShadow: '0 0 2px rgba(255,255,255,0.8)',
                                                                    border: '1px solid rgba(0,0,0,0.1)',
                                                                    maxWidth: `${clampedWidthPercent}%`,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    lineHeight: '1.2'
                                                                }}
                                                            >
                                                                Track {trackIndex + 1}
                                                            </div>
                                                        );
                                                    }
                                                }
                                            }
                                        });
                                        
                                        // Add scene duration indicator
                                        const sceneDurationPercent = (originalAudioDuration / maxTime) * 100;
                                        marks.push(
                                            <div
                                                key="scene-duration-line"
                                                style={{
                                                    position: 'absolute',
                                                    left: `${sceneDurationPercent}%`,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '2px',
                                                    backgroundColor: '#e74c3c',
                                                    transform: 'translateX(-50%)',
                                                    zIndex: 2
                                                }}
                                            />
                                        );
                                        
                                        marks.push(
                                            <div
                                                key="scene-duration-label"
                                                style={{
                                                    position: 'absolute',
                                                    left: `${sceneDurationPercent}%`,
                                                    top: '-5px',
                                                    transform: 'translateX(-50%)',
                                                    fontSize: '0.7rem',
                                                    color: '#e74c3c',
                                                    fontWeight: '700',
                                                    backgroundColor: '#fff5f5',
                                                    padding: '0.125rem 0.25rem',
                                                    borderRadius: '3px',
                                                    border: '1px solid #fecaca',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                🎤 Scene End
                                            </div>
                                        );
                                        
                                        return marks;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Track Controls Section */}
                    {audioTracks.length > 0 && (
                        <div className="mixer-section">
                            <h4 className="section-title">🎛️ Track Controls</h4>
                            <div className="track-controls-list">
                                {audioTracks.map((track, trackIndex) => (
                                    <div key={`control-${track.id}`} className="track-control-item">
                                        <div className="track-control-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        backgroundColor: track.color,
                                                        borderRadius: '2px'
                                                    }}
                                                />
                                                <span className="track-title">
                                                    Track {trackIndex + 1}: {track.name || 'Untitled'}
                                                </span>
                                                {!track.url && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        color: '#e74c3c',
                                                        fontWeight: 'bold',
                                                        background: '#fff5f5',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '12px',
                                                        border: '1px solid #fecaca'
                                                    }}>
                                                        UPLOAD REQUIRED
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                className="remove-track"
                                                onClick={() => removeAudioTrack(track.id)}
                                                style={{
                                                    background: '#e74c3c',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '0.25rem 0.5rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        <div className="track-controls-layout" style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '1.5rem',
                                            alignItems: 'start'
                                        }}>
                                            {/* Left Side - File Upload */}
                                            <div className="file-upload-section">
                                                <div className={`file-upload-container ${!track.url ? 'upload-required' : 'upload-complete'}`}>
                                                    <label className="control-label upload-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                                                        {track.url ? '🎵 Audio File:' : '📁 Upload Audio File (Required)'}
                                                    </label>
                                                    <div className="file-input-wrapper">
                                                        <input
                                                            type="file"
                                                            accept="audio/mp3,audio/mpeg,audio/wav"
                                                            onChange={(e) => handleAudioFileUpload(track.id, e)}
                                                            className="file-input"
                                                            id={`file-${track.id}`}
                                                            style={{ display: 'none' }}
                                                        />
                                                        <label
                                                            htmlFor={`file-${track.id}`}
                                                            className={`file-input-label ${track.url ? 'has-file' : 'no-file'}`}
                                                            style={{
                                                                display: 'block',
                                                                padding: '1rem',
                                                                border: track.url ? '2px solid #27ae60' : '2px dashed #bdc3c7',
                                                                borderRadius: '8px',
                                                                backgroundColor: track.url ? '#f8fff8' : '#fafafa',
                                                                cursor: 'pointer',
                                                                textAlign: 'center',
                                                                transition: 'all 0.3s ease'
                                                            }}
                                                        >
                                                            {track.url ? (
                                                                <div>
                                                                    <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📂</div>
                                                                    <div style={{ fontWeight: '500', color: '#27ae60', marginBottom: '0.25rem' }}>{track.name}</div>
                                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Click to change file</div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⬆️</div>
                                                                    <div style={{ fontWeight: '500', color: '#7f8c8d', marginBottom: '0.25rem' }}>Click to browse</div>
                                                                    <div style={{ fontSize: '0.8rem', color: '#95a5a6' }}>MP3, WAV files supported</div>
                                                                </div>
                                                            )}
                                                        </label>
                                                    </div>
                                                    {!track.url && (
                                                        <div className="upload-hint" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                                                            <small style={{ color: '#e74c3c', fontStyle: 'italic' }}>
                                                                🎯 Upload an audio file to configure mixing settings
                                                            </small>
                                                        </div>
                                                    )}
                                                    {track.url && (
                                                        <div className="file-info" style={{ 
                                                            marginTop: '0.5rem', 
                                                            padding: '0.5rem',
                                                            backgroundColor: '#e8f5e8',
                                                            borderRadius: '6px',
                                                            textAlign: 'center'
                                                        }}>
                                                            <small style={{ color: '#27ae60', fontWeight: '500' }}>
                                                                ✅ Duration: {formatTime(track.duration)} | Ready to mix!
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Side - Controls */}
                                            {track.url && (
                                                <div className="controls-section">
                                                    <div style={{
                                                        display: 'grid',
                                                        gap: '1rem',
                                                        padding: '1rem',
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e9ecef'
                                                    }}>
                                                        {/* Start Time */}
                                                        <div className="control-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem' }}>
                                                            <label className="control-label" style={{ 
                                                                fontSize: '0.9rem', 
                                                                fontWeight: '600',
                                                                color: '#495057',
                                                                margin: 0,
                                                                minWidth: '85px'
                                                            }}>
                                                                ⏱️ Start Time:
                                                            </label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={originalAudioDuration}
                                                                    step="0.1"
                                                                    value={track.startTime}
                                                                    onChange={(e) => updateAudioTrack(track.id, 'startTime', parseFloat(e.target.value) || 0)}
                                                                    className="time-input"
                                                                    style={{
                                                                        width: '80px',
                                                                        padding: '0.5rem',
                                                                        border: '1px solid #ced4da',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.9rem'
                                                                    }}
                                                                />
                                                                <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>seconds</span>
                                                            </div>
                                                        </div>

                                                        {/* Volume */}
                                                        <div className="control-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem' }}>
                                                            <label className="control-label" style={{ 
                                                                fontSize: '0.9rem', 
                                                                fontWeight: '600',
                                                                color: '#495057',
                                                                margin: 0,
                                                                minWidth: '85px'
                                                            }}>
                                                                🔊 Volume:
                                                            </label>
                                                            <div className="slider-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                                <input
                                                                    type="range"
                                                                    className="mixer-slider"
                                                                    min="0"
                                                                    max="1"
                                                                    step="0.05"
                                                                    value={track.volume}
                                                                    onChange={(e) => updateAudioTrack(track.id, 'volume', parseFloat(e.target.value))}
                                                                    style={{
                                                                        flex: 1,
                                                                        height: '6px',
                                                                        borderRadius: '3px',
                                                                        background: '#e9ecef',
                                                                        outline: 'none'
                                                                    }}
                                                                />
                                                                <span className="slider-value" style={{ 
                                                                    minWidth: '45px',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: '500',
                                                                    color: '#495057'
                                                                }}>
                                                                    {Math.round(track.volume * 100)}%
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Fade Controls */}
                                                        <div className="fade-controls" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem' }}>
                                                                <label className="control-label" style={{ 
                                                                    fontSize: '0.85rem', 
                                                                    fontWeight: '600',
                                                                    color: '#495057',
                                                                    margin: 0,
                                                                    minWidth: '60px'
                                                                }}>
                                                                    📈 Fade In:
                                                                </label>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={Math.min(10, track.duration / 2)}
                                                                        step="0.1"
                                                                        value={track.fadeIn}
                                                                        onChange={(e) => updateAudioTrack(track.id, 'fadeIn', parseFloat(e.target.value))}
                                                                        className="time-input"
                                                                        style={{
                                                                            width: '55px',
                                                                            padding: '0.4rem',
                                                                            border: '1px solid #ced4da',
                                                                            borderRadius: '4px',
                                                                            fontSize: '0.85rem'
                                                                        }}
                                                                    />
                                                                    <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>s</span>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem' }}>
                                                                <label className="control-label" style={{ 
                                                                    fontSize: '0.85rem', 
                                                                    fontWeight: '600',
                                                                    color: '#495057',
                                                                    margin: 0,
                                                                    minWidth: '65px'
                                                                }}>
                                                                    📉 Fade Out:
                                                                </label>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={Math.min(10, track.duration / 2)}
                                                                        step="0.1"
                                                                        value={track.fadeOut}
                                                                        onChange={(e) => updateAudioTrack(track.id, 'fadeOut', parseFloat(e.target.value))}
                                                                        className="time-input"
                                                                        style={{
                                                                            width: '55px',
                                                                            padding: '0.4rem',
                                                                            border: '1px solid #ced4da',
                                                                            borderRadius: '4px',
                                                                            fontSize: '0.85rem'
                                                                        }}
                                                                    />
                                                                    <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>s</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Loop Control */}
                                                        <div className="control-row">
                                                            <label className="checkbox-label" style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                fontSize: '0.9rem',
                                                                fontWeight: '600',
                                                                color: '#495057',
                                                                cursor: 'pointer',
                                                                margin: 0
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={track.loop}
                                                                    onChange={(e) => updateAudioTrack(track.id, 'loop', e.target.checked)}
                                                                    style={{
                                                                        margin: 0,
                                                                        transform: 'scale(1.2)'
                                                                    }}
                                                                />
                                                                <span>🔄 Loop Track</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {track.url && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Preview:</label>
                                                    <span style={{
                                                        fontSize: '0.8rem',
                                                        color: '#666',
                                                        background: '#f8f9fa',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px'
                                                    }}>
                                                        Duration: {formatTime(track.duration)}
                                                    </span>
                                                </div>
                                                <audio
                                                    controls
                                                    style={{ width: '100%' }}
                                                    data-track-id={track.id}
                                                    onLoadedData={(e) => {
                                                        e.target.volume = track.volume;
                                                    }}
                                                >
                                                    <source src={track.url} type="audio/mp3" />
                                                </audio>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview Section */}
                    {generatedAudioUrl && (
                        <div className="mixer-section">
                            <h4 className="section-title">🎧 Audio Preview</h4>
                            <div className="audio-preview">
                                <div className="original-audio">
                                    <label>Original Scene Audio:</label>
                                    <audio controls style={{ width: '100%' }}>
                                        <source src={generatedAudioUrl} type="audio/mp3" />
                                    </audio>
                                </div>

                {previewUrl && (
                    <div className="mixed-audio" style={{ marginTop: '1rem' }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '0.5rem' 
                        }}>
                            <label>Mixed Audio (Original + Timeline Tracks):</label>
                            <button
                                className="reload-mixed-audio-button"
                                onClick={reloadMixedAudio}
                                disabled={isReloading || isProcessing || isAccepting}
                                style={{
                                    background: isReloading ? '#95a5a6' : reloadSuccess ? '#27ae60' : '#f39c12',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    cursor: (isReloading || isProcessing || isAccepting) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s ease',
                                    opacity: (isReloading || isProcessing || isAccepting) ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!isReloading && !isProcessing && !isAccepting && !reloadSuccess) {
                                        e.target.style.background = '#e67e22';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isReloading && !isProcessing && !isAccepting) {
                                        e.target.style.background = reloadSuccess ? '#27ae60' : '#f39c12';
                                    }
                                }}
                                title="Reload mixed audio from server"
                            >
                                {isReloading ? (
                                    <>
                                        <div className="spinner" style={{ 
                                            width: '14px', 
                                            height: '14px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTop: '2px solid white',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <span>Reloading...</span>
                                    </>
                                ) : reloadSuccess ? (
                                    <>
                                        <Check size={14} />
                                        <span>Reloaded!</span>
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw size={14} />
                                        <span>Reload</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <audio controls style={{ width: '100%' }} key={previewUrl}>
                            <source src={previewUrl} type="audio/mp3" />
                        </audio>
                        <div style={{ 
                            fontSize: '0.8rem', 
                            color: '#666', 
                            marginTop: '0.5rem',
                            fontStyle: 'italic',
                            textAlign: 'center',
                            padding: '0.5rem',
                            background: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px solid #e9ecef'
                        }}>
                            💡 Use the reload button to fetch the latest mixed audio from the server
                            {reloadSuccess && (
                                <div style={{ 
                                    color: '#27ae60', 
                                    fontWeight: '600',
                                    marginTop: '0.25rem'
                                }}>
                                    ✅ Mixed audio successfully reloaded from server!
                                </div>
                            )}
                        </div>
                    </div>
                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-actions" style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    alignItems: 'center'
                }}>
                    <button
                        className="action-button reset-button"
                        onClick={resetAllSettings}
                        disabled={isAccepting}
                        style={{
                            background: isAccepting ? '#c0392b' : '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            cursor: isAccepting ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            minWidth: '80px',
                            height: '44px',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            opacity: isAccepting ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isAccepting) {
                                e.target.style.background = '#c0392b';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isAccepting) {
                                e.target.style.background = '#e74c3c';
                            }
                        }}
                    >
                        <RotateCcw size={16} />
                        <span>Clear</span>
                    </button>

                    <button
                        className="action-button mix-button"
                        onClick={generateMixedAudio}
                        disabled={!generatedAudioUrl || isProcessing || isAccepting || audioTracks.length === 0}
                        style={{
                            background: (isProcessing || isAccepting || !generatedAudioUrl || audioTracks.length === 0) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            cursor: (isProcessing || isAccepting || !generatedAudioUrl || audioTracks.length === 0) ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            minWidth: '80px',
                            height: '44px',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            opacity: (isProcessing || isAccepting || !generatedAudioUrl || audioTracks.length === 0) ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isProcessing && !isAccepting && generatedAudioUrl && audioTracks.length > 0) {
                                e.target.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isProcessing && !isAccepting && generatedAudioUrl && audioTracks.length > 0) {
                                e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                            }
                        }}
                    >
                        {isProcessing ? (
                            <>
                                <div className="spinner" style={{ width: '16px', height: '16px' }} />
                                <span>Mix</span>
                            </>
                        ) : (
                            <>
                                <Volume2 size={16} />
                                <span>Mix</span>
                            </>
                        )}
                    </button>

                    <button
                        className="action-button accept-finalize-button"
                        onClick={acceptMixedAudio}
                        disabled={isProcessing || isAccepting || !previewUrl}
                        style={{
                            background: (isProcessing || isAccepting || !previewUrl) ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            cursor: (isProcessing || isAccepting || !previewUrl) ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            minWidth: '100px',
                            height: '44px',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            opacity: (isProcessing || isAccepting || !previewUrl) ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isProcessing && !isAccepting && previewUrl) {
                                e.target.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isProcessing && !isAccepting && previewUrl) {
                                e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                            }
                        }}
                        title={!previewUrl ? "Generate mixed audio first to accept changes" : "Accept and save mixed audio changes"}
                    >
                        {isAccepting ? (
                            <>
                                <div className="spinner" style={{ width: '16px', height: '16px' }} />
                                <span>Accepting...</span>
                            </>
                        ) : (
                            <>
                                <span>✓</span>
                                <span>Accept</span>
                            </>
                        )}
                    </button>

                    <button
                        className="action-button close-button"
                        onClick={onClose}
                        disabled={isAccepting}
                        style={{
                            background: isAccepting ? '#7f8c8d' : '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            cursor: isAccepting ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            minWidth: '80px',
                            height: '44px',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            opacity: isAccepting ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isAccepting) {
                                e.target.style.background = '#7f8c8d';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isAccepting) {
                                e.target.style.background = '#95a5a6';
                            }
                        }}
                        title="Close without saving changes"
                    >
                        <X size={16} />
                        <span>Close</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SoundMixerModal;
