import React from 'react';
import './AnimationModal.css';

const AnimationComponent = ({ 
    animationSettings, 
    onSettingsChange, 
    onBulkSettingsChange = null,
    showDurationSetting = true, 
    showDimensionSettings = true,
    frameIndex = null 
}) => {
    const updateSetting = (key, value) => {
        onSettingsChange(key, value);
    };

    return (
        <div className="animation-settings">
            {/* Animation Type Dropdown */}
            <div className="setting-group">
                <label className="setting-label">
                    Animation Type{frameIndex !== null ? ` (Frame ${frameIndex + 1})` : ''}:
                </label>
                <select
                    className="setting-select"
                    value={animationSettings.type}
                    onChange={(e) => {
                        const type = e.target.value;
                        const defaultSettings = {
                            'Ken Burns': {
                                type: 'Ken Burns',
                                intensity: 1.0,
                                duration: animationSettings.duration,
                                direction: ['zoom-in'],
                                startScale: 1.0,
                                endScale: 1.1,
                                xOffset: 0,
                                yOffset: 0,
                                width: animationSettings.width,
                                height: animationSettings.height
                            },
                            'Parallax': {
                                type: 'Parallax',
                                intensity: 1.0,
                                duration: animationSettings.duration,
                                direction: 'left-to-right',
                                speed: 0.5,
                                layers: 2,
                                width: animationSettings.width,
                                height: animationSettings.height
                            },
                            'Cinemagraph': {
                                type: 'Cinemagraph',
                                intensity: 1.0,
                                duration: animationSettings.duration,
                                mask: 'center',
                                motionType: 'subtle-zoom',
                                loopDuration: 3,
                                width: animationSettings.width,
                                height: animationSettings.height
                            },
                            'Static': {
                                type: 'Static',
                                intensity: 1.0,
                                duration: animationSettings.duration,
                                width: animationSettings.width,
                                height: animationSettings.height
                            }
                        };

                        // Update all settings for the new animation type
                        const newSettings = { ...defaultSettings[type] };
                        
                        // Use bulk update if available, otherwise update individually
                        if (onBulkSettingsChange) {
                            onBulkSettingsChange(newSettings);
                        } else {
                            // Individual property updates
                            Object.keys(newSettings).forEach(key => {
                                updateSetting(key, newSettings[key]);
                            });
                        }
                    }}
                >
                    <option value="Ken Burns">Ken Burns (Pan & Zoom)</option>
                    <option value="Parallax">Parallax (Layer Movement)</option>
                    <option value="Cinemagraph">Cinemagraph (Selective Motion)</option>
                    <option value="Static">Static (No Animation)</option>
                </select>
            </div>

            {/* Duration Setting */}
            {showDurationSetting && (
                <div className="setting-group">
                    <label className="setting-label">Duration (seconds):</label>
                    <input
                        type="number"
                        className="setting-input"
                        min="0.1"
                        max="30"
                        step="0.1"
                        value={animationSettings.duration || 5}
                        onChange={(e) => updateSetting('duration', parseFloat(e.target.value))}
                    />
                </div>
            )}

            {/* Video Dimensions */}
            {showDimensionSettings && (
                <>
                    <div className="setting-group">
                        <label className="setting-label">Width:</label>
                        <input
                            type="number"
                            className="setting-input"
                            min="480"
                            max="3840"
                            step="2"
                            value={animationSettings.width || 1280}
                            onChange={(e) => updateSetting('width', parseInt(e.target.value))}
                        />
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Height:</label>
                        <input
                            type="number"
                            className="setting-input"
                            min="360"
                            max="2160"
                            step="2"
                            value={animationSettings.height || 720}
                            onChange={(e) => updateSetting('height', parseInt(e.target.value))}
                        />
                    </div>

                    {/* Common Dimension Presets */}
                    <div className="setting-group">
                        <label className="setting-label">Common Presets:</label>
                        <div className="dimension-presets">
                            <button
                                type="button"
                                className="preset-button"
                                onClick={() => {
                                    updateSetting('width', 1280);
                                    updateSetting('height', 720);
                                }}
                            >
                                720p (1280×720)
                            </button>
                            <button
                                type="button"
                                className="preset-button"
                                onClick={() => {
                                    updateSetting('width', 1920);
                                    updateSetting('height', 1080);
                                }}
                            >
                                1080p (1920×1080)
                            </button>
                            <button
                                type="button"
                                className="preset-button"
                                onClick={() => {
                                    updateSetting('width', 1080);
                                    updateSetting('height', 1080);
                                }}
                            >
                                Square (1080×1080)
                            </button>
                            <button
                                type="button"
                                className="preset-button"
                                onClick={() => {
                                    updateSetting('width', 1080);
                                    updateSetting('height', 1920);
                                }}
                            >
                                Portrait (1080×1920)
                            </button>
                        </div>
                    </div>
                </>
            )}

            {animationSettings.type !== 'Static' && (<div className="setting-group">
                <label className="setting-label">Intensity:</label>
                <input
                    type="range"
                    className="setting-slider"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={animationSettings.intensity || 1.0}
                    onChange={(e) => updateSetting('intensity', parseFloat(e.target.value))}
                />
                <span className="setting-value">{animationSettings.intensity || 1.0}</span>
            </div>)}

            {/* Ken Burns Specific Settings */}
            {animationSettings.type === 'Ken Burns' && (
                <>
                    <div className="setting-group">
                        <label className="setting-label">Direction:</label>
                        <select
                            className="setting-select"
                            multiple={true}
                            value={Array.isArray(animationSettings.direction) ? animationSettings.direction : [animationSettings.direction]}
                            onChange={(e) => updateSetting('direction', Array.from(e.target.selectedOptions, option => option.value))}
                        >
                            <option value="zoom-in">Zoom In</option>
                            <option value="zoom-out">Zoom Out</option>
                            <option value="pan-left">Pan Left</option>
                            <option value="pan-right">Pan Right</option>
                            <option value="pan-up">Pan Up</option>
                            <option value="pan-down">Pan Down</option>
                        </select>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Start Scale:</label>
                        <input
                            type="number"
                            className="setting-input"
                            min="0.5"
                            max="2.0"
                            step="0.05"
                            value={animationSettings.startScale || 1.0}
                            onChange={(e) => updateSetting('startScale', parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">End Scale:</label>
                        <input
                            type="number"
                            className="setting-input"
                            min="0.5"
                            max="2.0"
                            step="0.05"
                            value={animationSettings.endScale || 1.1}
                            onChange={(e) => updateSetting('endScale', parseFloat(e.target.value))}
                        />
                    </div>
                </>
            )}

            {/* Parallax Specific Settings */}
            {animationSettings.type === 'Parallax' && (
                <>
                    <div className="setting-group">
                        <label className="setting-label">Direction:</label>
                        <select
                            className="setting-select"
                            value={animationSettings.direction}
                            onChange={(e) => updateSetting('direction', e.target.value)}
                        >
                            <option value="left-to-right">Left to Right</option>
                            <option value="right-to-left">Right to Left</option>
                            <option value="top-to-bottom">Top to Bottom</option>
                            <option value="bottom-to-top">Bottom to Top</option>
                        </select>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Speed:</label>
                        <input
                            type="range"
                            className="setting-slider"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={animationSettings.speed || 0.5}
                            onChange={(e) => updateSetting('speed', parseFloat(e.target.value))}
                        />
                        <span className="setting-value">{animationSettings.speed || 0.5}</span>
                    </div>
                </>
            )}

            {/* Cinemagraph Specific Settings */}
            {animationSettings.type === 'Cinemagraph' && (
                <>
                    <div className="setting-group">
                        <label className="setting-label">Motion Area:</label>
                        <select
                            className="setting-select"
                            value={animationSettings.mask}
                            onChange={(e) => updateSetting('mask', e.target.value)}
                        >
                            <option value="center">Center</option>
                            <option value="left">Left Side</option>
                            <option value="right">Right Side</option>
                            <option value="top">Top Area</option>
                            <option value="bottom">Bottom Area</option>
                        </select>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Motion Type:</label>
                        <select
                            className="setting-select"
                            value={animationSettings.motionType}
                            onChange={(e) => updateSetting('motionType', e.target.value)}
                        >
                            <option value="subtle-zoom">Subtle Zoom</option>
                            <option value="wave">Wave Effect</option>
                            <option value="breathe">Breathing Effect</option>
                        </select>
                    </div>
                </>
            )}
        </div>
    );
};

export default AnimationComponent;
