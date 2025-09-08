import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Pause, RotateCcw } from 'lucide-react';
import { useToast } from './Toast';

const MicrophoneRecorder = ({ 
    onAudioRecorded, 
    disabled = false, 
    storyId, 
    sceneId, 
    className = '' 
}) => {
    const { toast } = useToast();
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioRef = useRef(null);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Timer for recording duration
    useEffect(() => {
        if (isRecording && !isPaused) {
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRecording, isPaused]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            // Check if browser supports MediaRecorder
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error('Not Supported', 'Microphone recording is not supported in this browser');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });
            
            streamRef.current = stream;
            audioChunksRef.current = [];
            
            // Use webm format if supported, fallback to other formats
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/wav';
                    }
                }
            }

            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: mimeType
            });

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { 
                    type: mimeType 
                });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudio({ blob: audioBlob, url: audioUrl, mimeType });
                
                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            mediaRecorderRef.current.start(1000); // Collect data every second
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);
            
            toast.success('Recording Started', 'Microphone recording has begun');
        } catch (error) {
            console.error('Error starting recording:', error);
            if (error.name === 'NotAllowedError') {
                toast.error('Permission Denied', 'Please allow microphone access to record audio');
            } else if (error.name === 'NotFoundError') {
                toast.error('No Microphone', 'No microphone found on this device');
            } else {
                toast.error('Recording Error', 'Failed to start recording: ' + error.message);
            }
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            toast.info('Recording Paused', 'Recording has been paused');
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            toast.info('Recording Resumed', 'Recording has been resumed');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            toast.success('Recording Stopped', 'Recording completed successfully');
        }
    };

    const playRecording = () => {
        if (recordedAudio && audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const pausePlayback = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const resetRecording = () => {
        setRecordedAudio(null);
        setRecordingTime(0);
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const uploadRecording = async () => {
        if (!recordedAudio) {
            toast.error('No Recording', 'Please record audio first');
            return;
        }

        setIsUploading(true);
        
        try {
            // Convert blob to base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Audio = e.target.result;
                const base64Data = base64Audio.split(',')[1]; // Remove data:audio/*;base64, prefix
                
                // Generate filename with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const extension = recordedAudio.mimeType.includes('webm') ? 'webm' : 
                                recordedAudio.mimeType.includes('mp4') ? 'm4a' : 'wav';
                const filename = `recording-${timestamp}.${extension}`;

                // Upload audio to server as JSON
                const response = await fetch('http://localhost:8000/upload/audio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        story_id: storyId,
                        scene_id: String(sceneId),
                        audio: base64Data,
                        filename: filename,
                        mimetype: recordedAudio.mimeType
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    const audioUrl = `http://localhost:8000/files/${storyId}/audios/${result.filename}`;
                    
                    // Call the callback with the uploaded audio URL
                    onAudioRecorded(audioUrl, result.filename);
                    
                    toast.success('Upload Complete', 'Recorded audio uploaded successfully!');
                    
                    // Reset the recording state
                    resetRecording();
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            };

            reader.onerror = () => {
                throw new Error('Failed to read audio data');
            };

            reader.readAsDataURL(recordedAudio.blob);
        } catch (error) {
            console.error('Error uploading recording:', error);
            toast.error('Upload Failed', 'Failed to upload recording: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`microphone-recorder ${className}`}>
            {/* Recording Controls */}
            <div className="recorder-controls">
                {!isRecording && !recordedAudio && (
                    <button
                        className="control-button record-button"
                        onClick={startRecording}
                        disabled={disabled}
                        title="Start Recording (Beta)"
                    >
                        <Mic size={18} />
                        <span>Record Audio</span>
                        <span className="beta-tag">BETA</span>
                    </button>
                )}

                {isRecording && (
                    <div className="recording-active">
                        <div className="recording-status">
                            <div className="recording-indicator">
                                <div className="recording-dot"></div>
                                <span>Recording {formatTime(recordingTime)}</span>
                            </div>
                        </div>
                        
                        <div className="recording-controls">
                            {!isPaused ? (
                                <button
                                    className="control-button pause-button"
                                    onClick={pauseRecording}
                                    title="Pause Recording"
                                >
                                    <Pause size={16} />
                                </button>
                            ) : (
                                <button
                                    className="control-button resume-button"
                                    onClick={resumeRecording}
                                    title="Resume Recording"
                                >
                                    <Play size={16} />
                                </button>
                            )}
                            
                            <button
                                className="control-button stop-button"
                                onClick={stopRecording}
                                title="Stop Recording"
                            >
                                <Square size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Playback and Upload Controls */}
                {recordedAudio && !isRecording && (
                    <div className="playback-controls">
                        <audio
                            ref={audioRef}
                            src={recordedAudio.url}
                            onEnded={() => setIsPlaying(false)}
                        />
                        
                        <div className="recorded-audio-info">
                            <span>Recording: {formatTime(recordingTime)}</span>
                        </div>
                        
                        <div className="playback-buttons">
                            {!isPlaying ? (
                                <button
                                    className="control-button play-button"
                                    onClick={playRecording}
                                    title="Play Recording"
                                >
                                    <Play size={16} />
                                </button>
                            ) : (
                                <button
                                    className="control-button pause-button"
                                    onClick={pausePlayback}
                                    title="Pause Playback"
                                >
                                    <Pause size={16} />
                                </button>
                            )}
                            
                            <button
                                className="control-button reset-button"
                                onClick={resetRecording}
                                title="Reset Recording"
                            >
                                <RotateCcw size={16} />
                            </button>
                            
                            <button
                                className={`control-button upload-button ${isUploading ? 'loading' : ''}`}
                                onClick={uploadRecording}
                                disabled={isUploading}
                                title="Upload Recording"
                            >
                                {isUploading ? 'Uploading...' : 'Use Recording'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MicrophoneRecorder;
