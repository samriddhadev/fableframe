import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import AnimationComponent from './AnimationComponent';
import './AnimationModal.css';

const MultiFrameAnimationModal = ({ 
    isOpen, 
    onClose, 
    onGenerate, 
    isGenerating, 
    sceneIndex, 
    audioDuration = 5,
    initialSettings = null
}) => {
    // Multi-frame state
    const [isMultiFrame, setIsMultiFrame] = useState(false);
    const [frames, setFrames] = useState([]);
    
    // Single frame state (fallback to original behavior)
    const [singleFrameSettings, setSingleFrameSettings] = useState({
        type: 'Ken Burns',
        intensity: 1.0,
        duration: audioDuration,
        direction: ['zoom-in'],
        startScale: 1.0,
        endScale: 1.1,
        xOffset: 0,
        yOffset: 0,
        width: 1280,
        height: 720
    });

    // Transition options
    const transitionOptions = [
        { value: '', label: 'No Transition' },
        // Basic fades
        { value: 'fade', label: 'Fade (Crossfade)' },
        { value: 'fadeblack', label: 'Fade to Black' },
        { value: 'fadewhite', label: 'Fade to White' },
        // Directional wipes
        { value: 'wipeleft', label: 'Wipe Left' },
        { value: 'wiperight', label: 'Wipe Right' },
        { value: 'wipeup', label: 'Wipe Up' },
        { value: 'wipedown', label: 'Wipe Down' },
        // Sliding
        { value: 'slideleft', label: 'Slide Left' },
        { value: 'slideright', label: 'Slide Right' },
        { value: 'slideup', label: 'Slide Up' },
        { value: 'slidedown', label: 'Slide Down' },
        // Circular / angular
        { value: 'circlecrop', label: 'Circle Crop' },
        { value: 'circleopen', label: 'Circle Open' },
        { value: 'circleclose', label: 'Circle Close' },
        { value: 'radial', label: 'Radial' },
        // Rectangular / boxy
        { value: 'rectcrop', label: 'Rectangle Crop' },
        { value: 'distance', label: 'Distance (Expand)' },
        { value: 'hblur', label: 'Horizontal Blur' },
        { value: 'vblur', label: 'Vertical Blur' },
        // Other cool ones
        { value: 'smoothleft', label: 'Smooth Left' },
        { value: 'smoothright', label: 'Smooth Right' },
        { value: 'smoothup', label: 'Smooth Up' },
        { value: 'smoothdown', label: 'Smooth Down' },
        { value: 'dissolve', label: 'Dissolve' },
        { value: 'coverleft', label: 'Cover Left' },
        { value: 'coverright', label: 'Cover Right' },
        { value: 'coverup', label: 'Cover Up' },
        { value: 'coverdown', label: 'Cover Down' },
        { value: 'revealleft', label: 'Reveal Left' },
        { value: 'revealright', label: 'Reveal Right' },
        { value: 'revealup', label: 'Reveal Up' },
        { value: 'revealdown', label: 'Reveal Down' }
    ];

    // Initialize or restore settings
    useEffect(() => {
        if (initialSettings) {
            if (initialSettings.isMultiFrame) {
                setIsMultiFrame(true);
                setFrames(initialSettings.frames || []);
            } else {
                setSingleFrameSettings(initialSettings);
            }
        } else {
            // Reset to defaults
            setIsMultiFrame(false);
            setFrames([]);
            setSingleFrameSettings({
                type: 'Ken Burns',
                intensity: 1.0,
                duration: audioDuration,
                direction: ['zoom-in'],
                startScale: 1.0,
                endScale: 1.1,
                xOffset: 0,
                yOffset: 0,
                width: 1280,
                height: 720
            });
        }
    }, [initialSettings, audioDuration, isOpen]);

    // Initialize frames when switching to multi-frame
    useEffect(() => {
        if (isMultiFrame && frames.length === 0) {
            const defaultFramesCount = 2;
            const frameDuration = audioDuration / defaultFramesCount;
            
            const newFrames = Array.from({ length: defaultFramesCount }, (_, index) => ({
                id: Date.now() + index,
                duration: frameDuration,
                transition: index === 0 ? '' : 'fade', // No transition for first frame
                transitionDuration: 0.5,
                isExpanded: index === 0, // First frame expanded by default
                uploadedImage: null, // Store uploaded image for subsequent frames
                animation: {
                    type: 'Ken Burns',
                    intensity: 1.0,
                    direction: ['zoom-in'],
                    startScale: 1.0,
                    endScale: 1.1,
                    xOffset: 0,
                    yOffset: 0,
                    width: 1280,
                    height: 720
                }
            }));
            
            setFrames(newFrames);
        }
    }, [isMultiFrame, audioDuration]);

    const handleMultiFrameToggle = (checked) => {
        setIsMultiFrame(checked);
        
        if (!checked) {
            // Clear frames when switching back to single frame
            setFrames([]);
        }
    };

    const addFrame = () => {
        const currentTotalDuration = frames.reduce((total, frame) => total + frame.duration, 0);
        const remainingDuration = Math.max(0.1, audioDuration - currentTotalDuration);
        
        const newFrame = {
            id: Date.now(),
            duration: Math.min(remainingDuration, 2),
            transition: 'fade',
            transitionDuration: 0.5,
            isExpanded: false,
            uploadedImage: null, // Store uploaded image for subsequent frames
            animation: {
                type: 'Ken Burns',
                intensity: 1.0,
                direction: ['zoom-in'],
                startScale: 1.0,
                endScale: 1.1,
                xOffset: 0,
                yOffset: 0,
                width: 1280,
                height: 720
            }
        };
        
        setFrames([...frames, newFrame]);
    };

    const removeFrame = (frameId) => {
        if (frames.length <= 1) return; // Don't allow removing the last frame
        setFrames(frames.filter(frame => frame.id !== frameId));
        
        // Redistribute duration among remaining frames
        redistributeFrameDurations();
    };

    const redistributeFrameDurations = () => {
        if (frames.length <= 1) return;
        
        const newFrameDuration = audioDuration / frames.length;
        setFrames(frames.map(frame => ({
            ...frame,
            duration: newFrameDuration
        })));
    };

    const updateFrameDuration = (frameId, newDuration) => {
        setFrames(frames.map(frame => 
            frame.id === frameId 
                ? { ...frame, duration: Math.max(0.1, newDuration) }
                : frame
        ));
    };

    const updateFrameTransition = (frameId, transition) => {
        setFrames(frames.map(frame => 
            frame.id === frameId 
                ? { ...frame, transition }
                : frame
        ));
    };

    const updateFrameTransitionDuration = (frameId, duration) => {
        setFrames(frames.map(frame => 
            frame.id === frameId 
                ? { ...frame, transitionDuration: Math.max(0.1, duration) }
                : frame
        ));
    };

    const updateFrameAnimation = (frameId, key, value) => {
        setFrames(frames.map(frame => 
            frame.id === frameId 
                ? { 
                    ...frame, 
                    animation: { 
                        ...frame.animation, 
                        [key]: value 
                    }
                }
                : frame
        ));
    };

    const updateFrameAnimationBulk = (frameId, newAnimation) => {
        setFrames(frames.map(frame => 
            frame.id === frameId 
                ? { 
                    ...frame, 
                    animation: newAnimation
                }
                : frame
        ));
    };

    const toggleFrameExpansion = (frameId) => {
        setFrames(frames.map(frame => 
            frame.id === frameId 
                ? { ...frame, isExpanded: !frame.isExpanded }
                : frame
        ));
    };

    const updateSingleFrameSetting = (key, value) => {
        setSingleFrameSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerate = () => {
        if (isMultiFrame) {
            onGenerate({
                isMultiFrame: true,
                frames: frames,
                totalDuration: audioDuration
            });
        } else {
            onGenerate({
                isMultiFrame: false,
                ...singleFrameSettings
            });
        }
    };

    const getTotalFramesDuration = () => {
        return frames.reduce((total, frame) => total + frame.duration, 0);
    };

    const generateFFmpegPreview = () => {
        if (isMultiFrame) {
            if (frames.length === 0) {
                return `Multi-frame mode enabled - Add frames to see preview`;
            }
            
            const totalDuration = getTotalFramesDuration().toFixed(1);
            let preview = `Multi-frame animation with ${frames.length} frames (Total: ${totalDuration}s)\n`;
            return preview;
        } else {
            // Use the original generateFFmpegCommand logic for single frame
            return `Single frame: ${singleFrameSettings.type} animation (${singleFrameSettings.duration}s)`;
        }
    };

    // Handle image upload for frames
    const handleImageUpload = (frameId, event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    updateFrameImage(frameId, e.target.result);
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please select a valid image file.');
            }
        }
    };

    const updateFrameImage = (frameId, imageDataUrl) => {
        setFrames(frames.map(frame => 
            frame.id === frameId 
                ? { ...frame, uploadedImage: imageDataUrl }
                : frame
        ));
    };

    const removeFrameImage = (frameId) => {
        setFrames(frames.map(frame => 
            frame.id === frameId 
                ? { ...frame, uploadedImage: null }
                : frame
        ));
    };

    // Reset modal to default state
    const resetModalState = () => {
        // Clear uploaded images from frames
        setFrames(frames.map(frame => ({
            ...frame,
            uploadedImage: null
        })));
        
        // Reset to default single frame if no initial settings
        if (!initialSettings) {
            setIsMultiFrame(false);
            setFrames([]);
            setSingleFrameSettings({
                type: 'Ken Burns',
                intensity: 1.0,
                duration: audioDuration,
                direction: ['zoom-in'],
                startScale: 1.0,
                endScale: 1.1,
                xOffset: 0,
                yOffset: 0,
                width: 1280,
                height: 720
            });
        }
    };

    // Handle modal close with reset
    const handleClose = () => {
        resetModalState();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content animation-modal multi-frame-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">🎬 Video Animation Settings - Scene {sceneIndex + 1}</h3>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="animation-content">
                    {/* Multi-Frame Toggle */}
                    <div className="setting-group multi-frame-toggle">
                        <label className="setting-label">
                            <input
                                type="checkbox"
                                checked={isMultiFrame}
                                onChange={(e) => handleMultiFrameToggle(e.target.checked)}
                                className="multi-frame-checkbox"
                            />
                            <span className="checkbox-text">Multi-Frame Animation</span>
                        </label>
                        <p className="setting-description">
                            {isMultiFrame 
                                ? "Create multiple animated segments with transitions between them" 
                                : "Use a single animation for the entire scene"
                            }
                        </p>
                    </div>

                    {/* Single Frame Animation */}
                    {!isMultiFrame && (
                        <div className="single-frame-settings">
                            <AnimationComponent
                                animationSettings={singleFrameSettings}
                                onSettingsChange={updateSingleFrameSetting}
                                showDurationSetting={true}
                                showDimensionSettings={true}
                            />
                        </div>
                    )}

                    {/* Multi-Frame Animation */}
                    {isMultiFrame && (
                        <div className="multi-frame-settings">
                            {/* Frame Duration Summary */}
                            <div className="frames-summary">
                                <div className="duration-info">
                                    <span>Total Duration: {getTotalFramesDuration().toFixed(1)}s / {audioDuration}s</span>
                                    {getTotalFramesDuration() > audioDuration && (
                                        <span className="duration-warning"> ⚠️ Exceeds audio duration</span>
                                    )}
                                </div>
                                <button 
                                    className="redistribute-button"
                                    onClick={redistributeFrameDurations}
                                    title="Redistribute frame durations equally"
                                >
                                    ⚖️ Redistribute
                                </button>
                            </div>

                            {/* Frames List */}
                            <div className="frames-list">
                                {frames.map((frame, index) => (
                                    <div key={frame.id} className={`frame-item ${frame.isExpanded ? 'expanded' : ''}`}>
                                        <div className="frame-header">
                                            <button
                                                className="frame-toggle"
                                                onClick={() => toggleFrameExpansion(frame.id)}
                                            >
                                                {frame.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                            <h4 className="frame-title">Frame {index + 1}</h4>
                                            <div className="frame-controls">
                                                <span className="frame-duration">{frame.duration.toFixed(1)}s</span>
                                                {frames.length > 1 && (
                                                    <button
                                                        className="frame-remove"
                                                        onClick={() => removeFrame(frame.id)}
                                                        title="Remove frame"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {frame.isExpanded && (
                                            <div className="frame-content">
                                                {/* Frame Duration */}
                                                <div className="setting-group">
                                                    <label className="setting-label">Frame Duration (seconds):</label>
                                                    <input
                                                        type="number"
                                                        className="setting-input"
                                                        min="0.1"
                                                        max={audioDuration}
                                                        step="0.1"
                                                        value={frame.duration}
                                                        onChange={(e) => updateFrameDuration(frame.id, parseFloat(e.target.value))}
                                                    />
                                                </div>

                                                {/* Transition (not for first frame) */}
                                                {index > 0 && (
                                                    <>
                                                        <div className="setting-group">
                                                            <label className="setting-label">Transition from Previous Frame:</label>
                                                            <select
                                                                className="setting-select"
                                                                value={frame.transition}
                                                                onChange={(e) => updateFrameTransition(frame.id, e.target.value)}
                                                            >
                                                                {transitionOptions.map(option => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {frame.transition && (
                                                            <div className="setting-group">
                                                                <label className="setting-label">Transition Duration (seconds):</label>
                                                                <input
                                                                    type="number"
                                                                    className="setting-input"
                                                                    min="0.1"
                                                                    max={Math.min(frame.duration, 2)}
                                                                    step="0.1"
                                                                    value={frame.transitionDuration}
                                                                    onChange={(e) => updateFrameTransitionDuration(frame.id, parseFloat(e.target.value))}
                                                                />
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Image Upload (only for frames after the first) */}
                                                {index > 0 && (
                                                    <div className="setting-group image-upload-group">
                                                        <label className="setting-label">Frame Image:</label>
                                                        <div className="image-upload-container">
                                                            {frame.uploadedImage ? (
                                                                <div className="image-preview-container">
                                                                    <img 
                                                                        src={frame.uploadedImage} 
                                                                        alt={`Frame ${index + 1}`}
                                                                        className="uploaded-image-preview"
                                                                        style={{
                                                                            maxWidth: '200px',
                                                                            maxHeight: '120px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #ddd'
                                                                        }}
                                                                    />
                                                                    <div className="image-actions">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeFrameImage(frame.id)}
                                                                            className="remove-image-button"
                                                                            style={{
                                                                                background: '#ff4444',
                                                                                color: 'white',
                                                                                border: 'none',
                                                                                padding: '4px 8px',
                                                                                borderRadius: '4px',
                                                                                cursor: 'pointer',
                                                                                fontSize: '12px',
                                                                                marginTop: '4px'
                                                                            }}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="image-upload-input">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => handleImageUpload(frame.id, e)}
                                                                        id={`image-upload-${frame.id}`}
                                                                        style={{ display: 'none' }}
                                                                    />
                                                                    <label 
                                                                        htmlFor={`image-upload-${frame.id}`}
                                                                        className="image-upload-label"
                                                                        style={{
                                                                            display: 'inline-block',
                                                                            padding: '8px 16px',
                                                                            background: '#f0f0f0',
                                                                            border: '2px dashed #ccc',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            textAlign: 'center',
                                                                            color: '#666',
                                                                            fontSize: '14px'
                                                                        }}
                                                                    >
                                                                        📁 Upload Custom Image
                                                                    </label>
                                                                    <p className="image-upload-note" style={{ 
                                                                        fontSize: '12px', 
                                                                        color: '#888', 
                                                                        margin: '4px 0 0 0' 
                                                                    }}>
                                                                        Upload a custom image for this frame, or leave empty to use the scene's generated image
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Frame Animation Settings */}
                                                <AnimationComponent
                                                    animationSettings={frame.animation}
                                                    onSettingsChange={(key, value) => updateFrameAnimation(frame.id, key, value)}
                                                    onBulkSettingsChange={(newAnimation) => updateFrameAnimationBulk(frame.id, newAnimation)}
                                                    showDurationSetting={false}
                                                    showDimensionSettings={index === 0} // Only show dimensions for first frame
                                                    frameIndex={index}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add Frame Button */}
                            <div className="add-frame-section">
                                <button 
                                    className="add-frame-button"
                                    onClick={addFrame}
                                    disabled={frames.length >= 10} // Reasonable limit
                                >
                                    <Plus size={16} />
                                    Add Frame
                                </button>
                                {frames.length >= 10 && (
                                    <span className="limit-text">Maximum 10 frames allowed</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    <div className="animation-preview">
                        <pre className="preview-description" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem' }}>
                            {generateFFmpegPreview()}
                        </pre>
                        
                        {isMultiFrame && (
                            <div className="frames-preview-list">
                                {frames.map((frame, index) => (
                                    <div key={frame.id} className="frame-preview">
                                        <strong>Frame {index + 1}:</strong> {frame.animation.type} 
                                        ({frame.duration.toFixed(1)}s)
                                        {index > 0 && frame.transition && (
                                            <span className="transition-preview"> → {frame.transition} transition</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Actions */}
                <div className="modal-actions">
                    <button className="cancel-button" onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        className="generate-button"
                        onClick={handleGenerate}
                        disabled={isGenerating || (isMultiFrame && frames.length === 0)}
                    >
                        🎬 Generate Video with Animation
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MultiFrameAnimationModal;
