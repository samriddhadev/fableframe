import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Sliders, Settings, Download, Wand2, RotateCcw, Play, Pause } from 'lucide-react';
import { useToast } from './Toast';

const AudioEnhancer = ({ 
    audioUrl, 
    audioFilename,
    storyId, 
    sceneId, 
    onAudioEnhanced,
    className = '' 
}) => {
    const { toast } = useToast();
    const [isVisible, setIsVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [enhancedAudioUrl, setEnhancedAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [settings, setSettings] = useState({
        // Volume and Dynamics
        volume: 0,          // dB adjustment (-20 to +20)
        normalize: true,    // Normalize audio levels
        compress: false,    // Dynamic range compression
        
        // Noise Reduction
        noiseReduction: false,
        noiseGate: false,
        gateThreshold: -40, // dB threshold for noise gate
        
        // EQ Settings
        bassBoost: 0,       // dB adjustment (-10 to +10)
        midBoost: 0,        // dB adjustment (-10 to +10) 
        trebleBoost: 0,     // dB adjustment (-10 to +10)
        
        // Effects
        reverb: false,
        reverbAmount: 0.2,  // 0 to 1
        echo: false,
        echoDelay: 500,     // milliseconds
        echoDecay: 0.3,     // 0 to 1
        
        // Advanced
        stereoWiden: false,
        fadeIn: 0,          // milliseconds
        fadeOut: 0,         // milliseconds
    });
    
    const audioRef = useRef(null);
    const enhancedAudioRef = useRef(null);

    const resetSettings = () => {
        setSettings({
            volume: 0,
            normalize: true,
            compress: false,
            noiseReduction: false,
            noiseGate: false,
            gateThreshold: -40,
            bassBoost: 0,
            midBoost: 0,
            trebleBoost: 0,
            reverb: false,
            reverbAmount: 0.2,
            echo: false,
            echoDelay: 500,
            echoDecay: 0.3,
            stereoWiden: false,
            fadeIn: 0,
            fadeOut: 0,
        });
        setEnhancedAudioUrl(null);
    };

    const enhanceAudio = async () => {
        if (!audioUrl) {
            toast.error('No Audio', 'No audio file to enhance');
            return;
        }

        setIsProcessing(true);
        
        try {
            const response = await fetch('http://localhost:8000/enhance/audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    story_id: storyId,
                    scene_id: String(sceneId),
                    audio_filename: audioFilename,
                    settings: settings
                })
            });

            const result = await response.json();
            
            if (result.success) {
                const enhancedUrl = `http://localhost:8000/files/${storyId}/audios/${result.filename}`;
                setEnhancedAudioUrl(enhancedUrl);
                toast.success('Audio Enhanced', 'Audio processing completed successfully!');
            } else {
                throw new Error(result.error || 'Enhancement failed');
            }
        } catch (error) {
            console.error('Error enhancing audio:', error);
            toast.error('Enhancement Failed', 'Failed to enhance audio: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const useEnhancedAudio = () => {
        if (enhancedAudioUrl && onAudioEnhanced) {
            // Extract filename from URL
            const filename = enhancedAudioUrl.split('/').pop();
            onAudioEnhanced(enhancedAudioUrl, filename);
            toast.success('Audio Updated', 'Enhanced audio is now being used');
            setIsVisible(false);
        }
    };

    const playAudio = (isEnhanced = false) => {
        const audioElement = isEnhanced ? enhancedAudioRef.current : audioRef.current;
        if (audioElement) {
            audioElement.play();
            setIsPlaying(true);
        }
    };

    const pauseAudio = () => {
        if (audioRef.current) audioRef.current.pause();
        if (enhancedAudioRef.current) enhancedAudioRef.current.pause();
        setIsPlaying(false);
    };

    const downloadAudio = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'enhanced_audio.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!audioUrl) return null;

    return (
        <div className={`audio-enhancer ${className}`}>
            <button
                className="control-button enhance-toggle-button"
                onClick={() => setIsVisible(!isVisible)}
                title="Audio Enhancement & Modulation"
            >
                <Sliders size={18} />
                <span>Enhance Audio</span>
                <span className="beta-tag">BETA</span>
            </button>

            {isVisible && (
                <div className="enhancement-panel">
                    <div className="enhancement-header">
                        <h3>Audio Enhancement & Modulation</h3>
                        <button
                            className="close-button"
                            onClick={() => setIsVisible(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div className="enhancement-content">
                        {/* Original Audio Preview */}
                        <div className="audio-preview-section">
                            <h4>Original Audio</h4>
                            <div className="audio-controls">
                                <audio
                                    ref={audioRef}
                                    src={audioUrl}
                                    onEnded={() => setIsPlaying(false)}
                                />
                                <button
                                    className="preview-button"
                                    onClick={() => playAudio(false)}
                                >
                                    <Play size={16} />
                                    Play Original
                                </button>
                            </div>
                        </div>

                        {/* Enhancement Settings */}
                        <div className="enhancement-settings">
                            <div className="settings-section">
                                <h4><Volume2 size={16} /> Volume & Dynamics</h4>
                                <div className="setting-group">
                                    <label>
                                        Volume Adjustment: {settings.volume}dB
                                        <input
                                            type="range"
                                            min="-20"
                                            max="20"
                                            step="1"
                                            value={settings.volume}
                                            onChange={(e) => setSettings({...settings, volume: parseInt(e.target.value)})}
                                        />
                                    </label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={settings.normalize}
                                            onChange={(e) => setSettings({...settings, normalize: e.target.checked})}
                                        />
                                        Normalize Audio Levels
                                    </label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={settings.compress}
                                            onChange={(e) => setSettings({...settings, compress: e.target.checked})}
                                        />
                                        Dynamic Range Compression
                                    </label>
                                </div>
                            </div>

                            <div className="settings-section">
                                <h4><VolumeX size={16} /> Noise Reduction</h4>
                                <div className="setting-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={settings.noiseReduction}
                                            onChange={(e) => setSettings({...settings, noiseReduction: e.target.checked})}
                                        />
                                        Background Noise Reduction
                                    </label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={settings.noiseGate}
                                            onChange={(e) => setSettings({...settings, noiseGate: e.target.checked})}
                                        />
                                        Noise Gate
                                    </label>
                                    {settings.noiseGate && (
                                        <label>
                                            Gate Threshold: {settings.gateThreshold}dB
                                            <input
                                                type="range"
                                                min="-60"
                                                max="-20"
                                                step="1"
                                                value={settings.gateThreshold}
                                                onChange={(e) => setSettings({...settings, gateThreshold: parseInt(e.target.value)})}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="settings-section">
                                <h4><Settings size={16} /> Equalizer</h4>
                                <div className="setting-group">
                                    <label>
                                        Bass: {settings.bassBoost > 0 ? '+' : ''}{settings.bassBoost}dB
                                        <input
                                            type="range"
                                            min="-10"
                                            max="10"
                                            step="1"
                                            value={settings.bassBoost}
                                            onChange={(e) => setSettings({...settings, bassBoost: parseInt(e.target.value)})}
                                        />
                                    </label>
                                    <label>
                                        Mid: {settings.midBoost > 0 ? '+' : ''}{settings.midBoost}dB
                                        <input
                                            type="range"
                                            min="-10"
                                            max="10"
                                            step="1"
                                            value={settings.midBoost}
                                            onChange={(e) => setSettings({...settings, midBoost: parseInt(e.target.value)})}
                                        />
                                    </label>
                                    <label>
                                        Treble: {settings.trebleBoost > 0 ? '+' : ''}{settings.trebleBoost}dB
                                        <input
                                            type="range"
                                            min="-10"
                                            max="10"
                                            step="1"
                                            value={settings.trebleBoost}
                                            onChange={(e) => setSettings({...settings, trebleBoost: parseInt(e.target.value)})}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="settings-section">
                                <h4><Wand2 size={16} /> Effects</h4>
                                <div className="setting-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={settings.reverb}
                                            onChange={(e) => setSettings({...settings, reverb: e.target.checked})}
                                        />
                                        Reverb
                                    </label>
                                    {settings.reverb && (
                                        <label>
                                            Reverb Amount: {Math.round(settings.reverbAmount * 100)}%
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={settings.reverbAmount}
                                                onChange={(e) => setSettings({...settings, reverbAmount: parseFloat(e.target.value)})}
                                            />
                                        </label>
                                    )}
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={settings.echo}
                                            onChange={(e) => setSettings({...settings, echo: e.target.checked})}
                                        />
                                        Echo
                                    </label>
                                    {settings.echo && (
                                        <>
                                            <label>
                                                Echo Delay: {settings.echoDelay}ms
                                                <input
                                                    type="range"
                                                    min="100"
                                                    max="1000"
                                                    step="50"
                                                    value={settings.echoDelay}
                                                    onChange={(e) => setSettings({...settings, echoDelay: parseInt(e.target.value)})}
                                                />
                                            </label>
                                            <label>
                                                Echo Decay: {Math.round(settings.echoDecay * 100)}%
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={settings.echoDecay}
                                                    onChange={(e) => setSettings({...settings, echoDecay: parseFloat(e.target.value)})}
                                                />
                                            </label>
                                        </>
                                    )}
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={settings.stereoWiden}
                                            onChange={(e) => setSettings({...settings, stereoWiden: e.target.checked})}
                                        />
                                        Stereo Widening
                                    </label>
                                </div>
                            </div>

                            <div className="settings-section">
                                <h4>Fade Effects</h4>
                                <div className="setting-group">
                                    <label>
                                        Fade In: {settings.fadeIn}ms
                                        <input
                                            type="range"
                                            min="0"
                                            max="3000"
                                            step="100"
                                            value={settings.fadeIn}
                                            onChange={(e) => setSettings({...settings, fadeIn: parseInt(e.target.value)})}
                                        />
                                    </label>
                                    <label>
                                        Fade Out: {settings.fadeOut}ms
                                        <input
                                            type="range"
                                            min="0"
                                            max="3000"
                                            step="100"
                                            value={settings.fadeOut}
                                            onChange={(e) => setSettings({...settings, fadeOut: parseInt(e.target.value)})}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Audio Preview */}
                        {enhancedAudioUrl && (
                            <div className="enhanced-preview-section">
                                <h4>Enhanced Audio</h4>
                                <div className="audio-controls">
                                    <audio
                                        ref={enhancedAudioRef}
                                        src={enhancedAudioUrl}
                                        onEnded={() => setIsPlaying(false)}
                                    />
                                    <button
                                        className="preview-button enhanced"
                                        onClick={() => playAudio(true)}
                                    >
                                        <Play size={16} />
                                        Play Enhanced
                                    </button>
                                    <button
                                        className="download-button"
                                        onClick={() => downloadAudio(enhancedAudioUrl, `enhanced_${audioFilename}`)}
                                    >
                                        <Download size={16} />
                                        Download
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="enhancement-actions">
                            <button
                                className="control-button reset-button"
                                onClick={resetSettings}
                                disabled={isProcessing}
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>
                            
                            <button
                                className={`control-button process-button ${isProcessing ? 'loading' : ''}`}
                                onClick={enhanceAudio}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="spinner-small" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={16} />
                                        Enhance Audio
                                    </>
                                )}
                            </button>

                            {enhancedAudioUrl && (
                                <button
                                    className="control-button use-button"
                                    onClick={useEnhancedAudio}
                                >
                                    Use Enhanced Audio
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioEnhancer;
