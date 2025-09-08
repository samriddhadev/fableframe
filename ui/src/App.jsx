import React, { useState, useEffect } from 'react';
import { ImagePlus, Mic, Film, PlayCircle, PlusCircle, Trash2, X, Video, FileVideo, ChevronDown, ChevronUp, Wand2, Eye, Check, Settings, RotateCcw, Upload } from 'lucide-react';
import './App.css';
import './AnimationModal.css';
import './ImageGenerationModal.css';
import './MicrophoneRecorder.css';
import './AudioEnhancer.css';
import SoundMixerModal from './SoundMixerModal';
import MultiFrameAnimationModal from './MultiFrameAnimationModal';
import MicrophoneRecorder from './MicrophoneRecorder';
import AudioEnhancer from './AudioEnhancer';
import { ToastProvider, useToast } from './Toast';

import { kenBurnsFilterExpression, 
    cinemagraphFilterExpression, 
    dollyzoomFilterExpression, 
    parallaxFilterExpression } from './AnimationUtil';

// Scene Component
const Scene = ({ scene, index, onUpdate, onRemove, globalVoiceInstructions, selectedVoice, storyId, isAnySceneGenerating, setIsAnySceneGenerating, isMergingFinalVideo, allScenes }) => {
    const { toast } = useToast();
    const [uploadedImage, setUploadedImage] = useState(null);
    const [uploadedAudio, setUploadedAudio] = useState(null);
    const [audioGenerated, setAudioGenerated] = useState(false);
    const [videoGenerated, setVideoGenerated] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [generatedAudioUrl, setGeneratedAudioUrl] = useState(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showAnimationModal, setShowAnimationModal] = useState(false);
    const [showImageGenerationModal, setShowImageGenerationModal] = useState(false);
    const [showSoundMixerModal, setShowSoundMixerModal] = useState(false);
    const [imageGenerationSettings, setImageGenerationSettings] = useState({
        visualPrompt: '',
        negativePrompt: 'blurry, low quality, distorted, watermark, text, signature',
        selectedModel: 'gemini-2.5-flash-image-preview',
        width: 1280,
        height: 720,
        selectedSceneImage: null,
        generatedPreview: null,
        isGenerating: false,
        isGeneratingPrompt: false
    });
    const [animationSettings, setAnimationSettings] = useState({
        type: 'Ken Burns',
        intensity: 1.0,
        duration: 5,
        direction: ['zoom-in'],
        startScale: 1.0,
        endScale: 1.1,
        xOffset: 0,
        yOffset: 0,
        width: 1280,
        height: 720
    });
    const [multiFrameAnimationSettings, setMultiFrameAnimationSettings] = useState(null);

    // Restore state from persisted scene data (localStorage)
    useEffect(() => {
        console.log(`Scene ${index + 1} restoration:`, {
            hasImage: !!scene.image,
            hasAudio: scene.hasAudio,
            hasVideo: scene.hasVideo
        });

        // Restore image state
        if (scene.image) {
            console.log(`Scene ${index + 1} - Setting uploaded image:`, scene.image);
            setUploadedImage(scene.image);
        } else {
            setUploadedImage(null);
        }

        // Restore audio state
        if (scene.uploadedAudio) {
            console.log(`Scene ${index + 1} - Restoring uploaded audio:`, scene.uploadedAudio);
            setUploadedAudio(scene.uploadedAudio);
            setAudioGenerated(true);
            setGeneratedAudioUrl(scene.uploadedAudio);
        } else if (scene.hasAudio && scene.audioUrl) {
            console.log(`Scene ${index + 1} - Restoring generated audio state`);
            setAudioGenerated(true);
            setGeneratedAudioUrl(scene.audioUrl);
        } else {
            setUploadedAudio(null);
            setAudioGenerated(false);
            setGeneratedAudioUrl(null);
        }

        // Restore video state
        if (scene.hasVideo && scene.videoUrl) {
            console.log(`Scene ${index + 1} - Restoring video state`);
            setVideoGenerated(true);
            setGeneratedVideoUrl(scene.videoUrl);
        } else {
            setVideoGenerated(false);
            setGeneratedVideoUrl(null);
        }

        // Restore animation settings
        if (scene.multiFrameAnimationSettings) {
            console.log(`Scene ${index + 1} - Restoring multi-frame animation settings`);
            setMultiFrameAnimationSettings(scene.multiFrameAnimationSettings);
        } else if (scene.animationSettings) {
            console.log(`Scene ${index + 1} - Restoring single-frame animation settings`);
            setAnimationSettings(scene.animationSettings);
            setMultiFrameAnimationSettings(null);
        } else {
            setMultiFrameAnimationSettings(null);
        }
    }, [scene]);

    const handleTextChange = (e) => {
        onUpdate(index, { ...scene, text: e.target.value });
    };

    const updateImageGenerationSetting = (key, value) => {
        setImageGenerationSettings(prev => ({ ...prev, [key]: value }));
    };

    const geminiModels = [
        { id: 'gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash Image Preview', description: 'Quality image generation' }
    ];

    const imageDimensions = [
        { width: 1024, height: 768, label: '1024x768 (4:3)' },
        { width: 1280, height: 720, label: '1280x720 (16:9)' },
        { width: 1024, height: 1024, label: '1024x1024 (1:1)' },
        { width: 768, height: 1024, label: '768x1024 (3:4 Portrait)' },
        { width: 1920, height: 1080, label: '1920x1080 (Full HD)' }
    ];

    const generateImagePreview = async () => {
        if (!imageGenerationSettings.visualPrompt.trim()) {
            toast.warning('Visual Prompt Required', 'Please enter a visual prompt first.');
            return;
        }

        try {
            updateImageGenerationSetting('isGenerating', true);
            updateImageGenerationSetting('generatedPreview', null);

            // Prepare reference scene data
            let referenceSceneId = null;
            if (imageGenerationSettings.selectedSceneImage) {
                // Find the selected reference scene
                const referenceScene = allScenes.find(s => s.id === imageGenerationSettings.selectedSceneImage);
                if (referenceScene) {
                    referenceSceneId = String(referenceScene.id);
                }
            }

            // Simulate API call for image generation
            const response = await fetch('http://localhost:8000/generate/image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    story_id: storyId,
                    scene_id: String(scene.id),
                    visual_prompt: imageGenerationSettings.visualPrompt,
                    negative_prompt: imageGenerationSettings.negativePrompt,
                    model: imageGenerationSettings.selectedModel,
                    width: imageGenerationSettings.width,
                    height: imageGenerationSettings.height,
                    reference_scene_id: referenceSceneId
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const imageUrl = result.filename ?
                        `http://localhost:8000/${storyId}/images/${result.filename}` :
                        (result.image_url || `data:image/png;base64,${result.image}`);
                    updateImageGenerationSetting('generatedPreview', imageUrl);
                } else {
                    throw new Error(result.error || 'Image generation failed');
                }
            } else {
                // For demo purposes, simulate a successful generation
                setTimeout(() => {
                    const simulatedImageUrl = `https://picsum.photos/${imageGenerationSettings.width}/${imageGenerationSettings.height}?random=${Date.now()}`;
                    updateImageGenerationSetting('generatedPreview', simulatedImageUrl);
                }, 2000);
            }
        } catch (error) {
            console.error('Error generating image:', error);
            // For demo, still show a simulated image
            setTimeout(() => {
                const simulatedImageUrl = `https://picsum.photos/${imageGenerationSettings.width}/${imageGenerationSettings.height}?random=${Date.now()}`;
                updateImageGenerationSetting('generatedPreview', simulatedImageUrl);
            }, 2000);
        } finally {
            setTimeout(() => {
                updateImageGenerationSetting('isGenerating', false);
            }, 2000);
        }
    };

    const acceptGeneratedImage = () => {
        if (imageGenerationSettings.generatedPreview) {
            setUploadedImage(imageGenerationSettings.generatedPreview);
            // Extract filename from URL if it's a backend file URL
            let imageFilename = null;
            if (imageGenerationSettings.generatedPreview.includes('/files/images/')) {
                imageFilename = imageGenerationSettings.generatedPreview.split('/files/images/')[1];
            }
            onUpdate(index, {
                ...scene,
                image: imageGenerationSettings.generatedPreview,
                imageFilename: imageFilename
            });
            setShowImageGenerationModal(false);
            // Reset the generation settings
            setImageGenerationSettings(prev => ({
                ...prev,
                generatedPreview: null,
                visualPrompt: '',
                selectedSceneImage: null,
                isGeneratingPrompt: false
            }));
        }
    };

    const autoGenerateVisualPrompt = async () => {
        if (!scene.text?.trim()) {
            toast.warning('Scene Text Required', 'Please add scene text first before auto-generating visual prompt.');
            return;
        }

        try {
            updateImageGenerationSetting('isGeneratingPrompt', true);

            // Get previous scene text for reference
            let previousReference = '';
            if (index > 0 && allScenes && allScenes[index - 1]?.text) {
                previousReference = allScenes[index - 1].text;
            }

            const response = await fetch('http://localhost:8000/generate/visual/prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: scene.text,
                    previous_reference: previousReference
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.visual_prompt) {
                    updateImageGenerationSetting('visualPrompt', result.visual_prompt);
                } else {
                    throw new Error(result.error || 'Failed to generate visual prompt');
                }
            } else {
                // For demo purposes, create a simple visual prompt
                const sceneType = scene.text.toLowerCase().includes('night') ? 'night scene' :
                    scene.text.toLowerCase().includes('day') ? 'daytime scene' : 'scene';
                const generatedPrompt = `A cinematic ${sceneType} depicting: ${scene.text.substring(0, 100)}${previousReference ? `. Continuing from previous context: ${previousReference.substring(0, 50)}...` : ''}. High quality, detailed, professional photography style.`;
                updateImageGenerationSetting('visualPrompt', generatedPrompt);
            }
        } catch (error) {
            console.error('Error generating visual prompt:', error);
            // Fallback to basic prompt generation
            const sceneType = scene.text.toLowerCase().includes('night') ? 'night scene' :
                scene.text.toLowerCase().includes('day') ? 'daytime scene' : 'scene';
            const fallbackPrompt = `A cinematic ${sceneType} depicting: ${scene.text.substring(0, 100)}. High quality, detailed, professional photography style.`;
            updateImageGenerationSetting('visualPrompt', fallbackPrompt);
        } finally {
            updateImageGenerationSetting('isGeneratingPrompt', false);
        }
    };

    const showImageGenerationModalHandler = () => {
        setShowImageGenerationModal(true);
        // Pre-fill visual prompt with scene text if available
        if (scene.text && !imageGenerationSettings.visualPrompt) {
            updateImageGenerationSetting('visualPrompt', scene.text);
        }
    };

    const generateFFmpegCommand = (settings) => {
        const fps = 25;
        // ⏱ use audio duration instead of settings.duration
        const duration = scene.audioDuration || 5;
        const width = settings.width || 1280;
        const height = settings.height || 720;

        let filter = `fps=${fps}`; // default fallback

        try {
            switch (settings.type) {
                case 'Ken Burns': {
                    filter = kenBurnsFilterExpression(settings, duration, width, height, fps);
                    break;
                }
                case 'Parallax': {
                    filter = parallaxFilterExpression(settings, duration, width, height, fps);
                    break;
                }
                case 'Cinemagraph': {
                    filter = cinemagraphFilterExpression(settings, duration, width, height, fps);
                    break;
                }
                // case 'Dolly Zoom': {
                //     filter = dollyzoomFilterExpression(settings, duration, width, height, fps);
                //     break;
                // }

                case 'Static':
                    return null;

                default:
                    return null;
            }
        } catch (error) {
            console.error('Error generating FFmpeg command:', error);
            // Safe fallback
            filter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${fps}`;
        }

        // 🔥 Always append safe scaling to avoid "width/height not divisible by 2" error
        return `${filter},scale=trunc(iw/2)*2:trunc(ih/2)*2`;
    };

    const generateMultiFrameFFmpegCommand = (frames, totalDuration, sceneId) => {
        const fps = 25;
        const width = frames[0]?.animation?.width || 1280;
        const height = frames[0]?.animation?.height || 720;

        // Build input sources
        let inputs = [];
        let inputMapping = new Map(); // Map frame index to input index

        // First input is always the scene image
        inputs.push(`-loop 1 -i ${sceneId}.png`);
        inputMapping.set(0, 0); // Frame 0 uses input 0

        // Add additional inputs for frames with uploaded images
        let currentInputIndex = 1;
        frames.forEach((frame, frameIndex) => {
            if (frameIndex > 0 && frame.uploadedImage) {
                inputs.push(`-loop 1 -i frame_${sceneId}_${frameIndex}.png`);
                inputMapping.set(frameIndex, currentInputIndex);
                currentInputIndex++;
            } else if (frameIndex > 0) {
                // Frame without uploaded image uses scene image (input 0)
                inputMapping.set(frameIndex, 0);
            }
        });

        // Start building the FFmpeg command
        let ffmpegCommand = `ffmpeg ${inputs.join(' ')}`;

        // Build filter complex
        let filterChain = '';
        let videoSegments = [];

        // Create animated video segments for each frame
        frames.forEach((frame, frameIndex) => {
            const inputIndex = inputMapping.get(frameIndex);
            const segmentDuration = frame.duration;
            const segmentFrames = Math.floor(segmentDuration * fps);

            // Generate the animation filter for this frame
            let animationFilter = generateFrameAnimationFilter(frame.animation, segmentDuration, width, height, fps);

            // Remove trailing comma if present
            if (animationFilter.endsWith(',')) {
                animationFilter = animationFilter.slice(0, -1);
            }

            // For Ken Burns and other animations that use zoompan, we need to set the duration correctly
            if (frame.animation.type === 'Ken Burns' || frame.animation.type === 'Parallax' || frame.animation.type === 'Cinemagraph' || frame.animation.type === 'Dolly Zoom') {
                // Replace d=1 with the correct frame count for the duration
                animationFilter = animationFilter.replace(/d=1([,:])/, `d=${segmentFrames}$1`);
                // Create the video segment without tpad (zoompan handles duration)
                filterChain += `[${inputIndex}:v]${animationFilter}[segment${frameIndex}];`;
            } else {
                // For static animations, use tpad to set duration
                filterChain += `[${inputIndex}:v]${animationFilter},tpad=stop_mode=clone:stop_duration=${segmentDuration}[segment${frameIndex}];`;
            }

            videoSegments.push(`[segment${frameIndex}]`);
        });

        // Handle concatenation and transitions
        if (frames.length === 1) {
            // Single frame - just use the segment
            filterChain += `${videoSegments[0]}scale=trunc(iw/2)*2:trunc(ih/2)*2[output]`;
        } else {
            // Multiple frames - use concat filter for proper merging
            // For transitions, we need to use a different approach
            let hasTransitions = frames.slice(1).some(frame => frame.transition && frame.transition !== '');

            if (hasTransitions) {
                // Complex approach with transitions - use xfade between adjacent segments
                let finalOutput = videoSegments[0];

                for (let i = 1; i < frames.length; i++) {
                    const frame = frames[i];
                    const currentSegment = videoSegments[i];

                    if (frame.transition && frame.transition !== '') {
                        const transitionDuration = Math.min(frame.transitionDuration || 0.5, frame.duration / 2);
                        // Calculate proper offset for the transition
                        const previousDurations = frames.slice(0, i).reduce((sum, f) => sum + f.duration, 0);
                        const offset = previousDurations - transitionDuration;

                        filterChain += `${finalOutput}${currentSegment}xfade=transition=${frame.transition}:duration=${transitionDuration}:offset=${offset}[transition${i}];`;
                        finalOutput = `[transition${i}]`;
                    } else {
                        // Simple concatenation for frames without transitions
                        filterChain += `${finalOutput}${currentSegment}concat=n=2:v=1:a=0[concat${i}];`;
                        finalOutput = `[concat${i}]`;
                    }
                }

                filterChain += `${finalOutput}scale=trunc(iw/2)*2:trunc(ih/2)*2[output]`;
            } else {
                // Simple concatenation - no transitions
                filterChain += `${videoSegments.join('')}concat=n=${frames.length}:v=1:a=0,scale=trunc(iw/2)*2:trunc(ih/2)*2[output]`;
            }
        }

        // Add audio if available (assuming audio file exists)
        const audioInput = `-i ${sceneId}.mp3`;
        ffmpegCommand = `ffmpeg ${inputs.join(' ')} ${audioInput}`;

        // Complete the command with filter complex and output options
        ffmpegCommand += ` -filter_complex "${filterChain}" -map "[output]" -map ${inputs.length}:a`;
        ffmpegCommand += ` -t ${totalDuration} -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k`;
        ffmpegCommand += ` -pix_fmt yuv420p -shortest -y -movflags +faststart ${sceneId}_multiframe.mp4`;

        return ffmpegCommand;
    };

    const generateFrameAnimationFilter = (animationSettings, duration, width, height, fps) => {
        try {
            switch (animationSettings.type) {
                case 'Ken Burns': {
                    return kenBurnsFilterExpression(animationSettings, duration, width, height, fps) + ',';
                }

                case 'Parallax': {
                    return parallaxFilterExpression(animationSettings, duration, width, height, fps) + ',';
                }

                case 'Cinemagraph': {
                    return cinemagraphFilterExpression(animationSettings, duration, width, height, fps) + ',';
                }

                // case 'Dolly Zoom': {
                //     return dollyzoomFilterExpression(animationSettings, duration, width, height, fps) + ',';
                // }

                case 'Static':
                default:
                    return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${fps},`;
            }
        } catch (error) {
            console.error('Error generating frame animation filter:', error);
            return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${fps},`;
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Convert image to base64 and upload as JSON
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target.result;
                const base64Data = base64Image.split(',')[1]; // Remove data:image/jpeg;base64, prefix

                // Upload image to server as JSON
                fetch('http://localhost:8000/upload/image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        story_id: storyId,
                        scene_id: String(scene.id),
                        image: base64Data,
                        filename: file.name,
                        mimetype: file.type
                    })
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            const imageUrl = `http://localhost:8000/files/${storyId}/images/${result.filename}`;
                            setUploadedImage(imageUrl);
                            onUpdate(index, { ...scene, image: imageUrl, imageFilename: result.filename });
                            toast.success('Image Uploaded', 'Image uploaded successfully!');
                        } else {
                            throw new Error(result.error || 'Upload failed');
                        }
                    })
                    .catch(error => {
                        console.error('Error uploading image:', error);
                        toast.error('Upload Failed', 'Failed to upload image: ' + error.message);
                        // Fallback: use local base64 data
                        setUploadedImage(base64Image);
                        onUpdate(index, { ...scene, image: base64Image });
                    });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAudioUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Convert audio to base64 and upload as JSON
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Audio = e.target.result;
                const base64Data = base64Audio.split(',')[1]; // Remove data:audio/*;base64, prefix

                // Upload audio to server as JSON
                fetch('http://localhost:8000/upload/audio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        story_id: storyId,
                        scene_id: String(scene.id),
                        audio: base64Data,
                        filename: file.name,
                        mimetype: file.type
                    })
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            const audioUrl = `http://localhost:8000/files/${storyId}/audios/${result.filename}`;
                            setUploadedAudio(audioUrl);
                            setAudioGenerated(true);
                            setGeneratedAudioUrl(audioUrl);
                            onUpdate(index, { 
                                ...scene, 
                                uploadedAudio: audioUrl, 
                                audioFilename: result.filename,
                                hasAudio: true,
                                audioUrl: audioUrl
                            });
                            toast.success('Audio Uploaded', 'Audio uploaded successfully!');
                        } else {
                            throw new Error(result.error || 'Upload failed');
                        }
                    })
                    .catch(error => {
                        console.error('Error uploading audio:', error);
                        toast.error('Upload Failed', 'Failed to upload audio: ' + error.message);
                        // Fallback: use local base64 data
                        setUploadedAudio(base64Audio);
                        setAudioGenerated(true);
                        setGeneratedAudioUrl(base64Audio);
                        onUpdate(index, { 
                            ...scene, 
                            uploadedAudio: base64Audio,
                            hasAudio: true,
                            audioUrl: base64Audio
                        });
                    });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRecordedAudio = (audioUrl, filename) => {
        // Handle recorded audio from MicrophoneRecorder component
        setUploadedAudio(audioUrl);
        setAudioGenerated(true);
        setGeneratedAudioUrl(audioUrl);
        onUpdate(index, { 
            ...scene, 
            uploadedAudio: audioUrl, 
            audioFilename: filename,
            hasAudio: true,
            audioUrl: audioUrl
        });
    };

    const handleEnhancedAudio = (audioUrl, filename) => {
        // Handle enhanced audio from AudioEnhancer component
        setUploadedAudio(audioUrl);
        setAudioGenerated(true);
        setGeneratedAudioUrl(audioUrl);
        onUpdate(index, { 
            ...scene, 
            uploadedAudio: audioUrl, 
            audioFilename: filename,
            hasAudio: true,
            audioUrl: audioUrl
        });
    };

    const generateAudio = async () => {
        // Generate audio via API call
        const voiceToUse = selectedVoice || 'alloy';
        console.log(`Generating audio for Story ID: ${storyId}, Scene ${index + 1} with voice ${voiceToUse} (original: ${selectedVoice})`);

        try {
            // Show loading state
            setIsGeneratingAudio(true);
            setIsAnySceneGenerating(true); // Block global operations
            setAudioGenerated(false);
            setGeneratedAudioUrl(null);
            setUploadedAudio(null); // Clear any uploaded audio when generating new audio

            const response = await fetch('http://localhost:8000/generate/audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    story_id: storyId,
                    scene_id: String(scene.id),
                    text: scene.text,
                    voice_settings: {
                        instruction: globalVoiceInstructions || '',
                        voice: selectedVoice || 'alloy'
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success) {
                    // Use the backend file endpoint for audio
                    const audioUrl = result.filename ?
                        `http://localhost:8000/files/${storyId}/audios/${result.filename}` :
                        (result.audio_url || `data:audio/mp3;base64,${result.audio_data}`);
                    setGeneratedAudioUrl(audioUrl);
                    setAudioGenerated(true);
                    onUpdate(index, {
                        ...scene,
                        hasAudio: true,
                        audioUrl: audioUrl,
                        audioFilename: result.filename,
                        storyId: storyId,
                        audioDuration: result.duration,
                        uploadedAudio: null // Clear uploaded audio when generating new audio
                    });
                    toast.success(
                        `Audio Generated Successfully! 🎵`,
                        `Scene ${index + 1} audio is ready`
                    );
                } else {
                    throw new Error(result.error || 'Audio generation failed');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error generating audio:', error);
            toast.error(
                `Audio Generation Failed`,
                `Failed to generate audio for Scene ${index + 1}: ${error.message}`
            );
        } finally {
            setIsGeneratingAudio(false);
            setIsAnySceneGenerating(false); // Unblock global operations
        }
    };

    const generateVideo = async (customAnimationSettings = null) => {
        // Generate video via API call
        console.log(`Generating video for Story ID: ${storyId}, Scene ${index + 1}`);

        const videoAnimationSettings = customAnimationSettings || animationSettings;

        try {
            setIsGeneratingVideo(true);
            setIsAnySceneGenerating(true); // Block global operations
            setShowAnimationModal(false); // Close modal

            // Prepare the request body based on animation type
            let requestBody = {
                story_id: storyId,
                scene_id: String(scene.id),
                image: scene.image
            };

            // Handle multi-frame animations
            if (videoAnimationSettings.isMultiFrame) {
                requestBody.animation_type = 'multi-frame';
                requestBody.frames = videoAnimationSettings.frames.map((frame, index) => ({
                    ...frame,
                    // Include uploaded image data for frames that have it
                    uploadedImageData: index > 0 ? frame.uploadedImageData : null
                }));
                requestBody.total_duration = videoAnimationSettings.totalDuration;

                // Generate actual FFmpeg command for server execution
                const ffmpegCommand = generateMultiFrameFFmpegCommand(
                    videoAnimationSettings.frames,
                    videoAnimationSettings.totalDuration,
                    scene.id
                );
                requestBody.ffmpeg_command = ffmpegCommand; // Actual command for server execution

                // Log the generated command for debugging
                console.log('Generated Multi-Frame FFmpeg Command:', ffmpegCommand);
            } else {
                // Single frame animation (legacy)
                requestBody.animation = generateFFmpegCommand(videoAnimationSettings);
                requestBody.animation_type = 'single-frame';
            }

            const response = await fetch('http://localhost:8000/generate/video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success) {
                    setVideoGenerated(true);
                    const videoUrl = result.filename ?
                        `http://localhost:8000/files/${storyId}/videos/${result.filename}` :
                        (result.video_url || `data:video/mp4;base64,${result.video_data}`);
                    setGeneratedVideoUrl(videoUrl);

                    // Store the animation settings for future reference
                    const updatedScene = {
                        ...scene,
                        hasVideo: true,
                        videoUrl: videoUrl,
                        videoFilename: result.filename,
                        storyId: storyId,
                        videoDuration: result.duration,
                        animationSettings: videoAnimationSettings.isMultiFrame ? null : videoAnimationSettings,
                        multiFrameAnimationSettings: videoAnimationSettings.isMultiFrame ? videoAnimationSettings : null
                    };

                    console.log(`Scene ${index + 1} - Video generated successfully:`, {
                        hasVideo: updatedScene.hasVideo,
                        videoUrl: !!updatedScene.videoUrl,
                        isMultiFrame: !!videoAnimationSettings.isMultiFrame,
                        hasMultiFrameSettings: !!updatedScene.multiFrameAnimationSettings,
                        hasAnimationSettings: !!updatedScene.animationSettings,
                        fullUpdatedScene: updatedScene
                    });

                    onUpdate(index, updatedScene);

                    const animationType = videoAnimationSettings.isMultiFrame
                        ? `Multi-frame (${videoAnimationSettings.frames.length} frames)`
                        : videoAnimationSettings.type;

                    toast.success(
                        `Video Generated Successfully! 🎬`,
                        `Scene ${index + 1} video is ready\nAnimation: ${animationType}\nStory ID: ${storyId}`
                    );
                } else {
                    throw new Error(result.error || 'Video generation failed');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error generating video:', error);
            toast.error(
                `Video Generation Failed`,
                `Failed to generate video for Scene ${index + 1}: ${error.message}`
            );
        } finally {
            setIsGeneratingVideo(false);
            setIsAnySceneGenerating(false); // Unblock global operations
        }
    };

    const handleMultiFrameAnimationGenerate = (animationConfig) => {
        if (animationConfig.isMultiFrame) {
            // Store the multi-frame settings and trigger video generation
            setMultiFrameAnimationSettings(animationConfig);

            // Prepare the animation config with uploaded images for the server
            const configWithImages = {
                ...animationConfig,
                frames: animationConfig.frames.map((frame, index) => ({
                    ...frame,
                    // Keep the uploaded image data for frames that have it
                    uploadedImageData: index > 0 ? frame.uploadedImage : null
                }))
            };

            generateVideo(configWithImages);
        } else {
            // Handle single-frame animation
            setAnimationSettings(animationConfig);
            generateVideo(animationConfig);
        }
    };

    const showVideoGenerationModal = () => {
        if (!scene.text || !uploadedImage || !audioGenerated) {
            const missing = [];
            if (!scene.text) missing.push('text');
            if (!uploadedImage) missing.push('image');
            if (!audioGenerated) missing.push('audio');
            toast.warning('Requirements Missing', `Please add ${missing.join(', ')} before generating video.`);
            return;
        }
        setShowAnimationModal(true);
    };

    const openPreview = () => {
        if (videoGenerated) {
            setShowPreview(true);
        } else {
            toast.info('Video Not Ready', 'Please generate video first!');
        }
    };

    return (
        <>
            <div className={`scene-card ${(isGeneratingAudio || isGeneratingVideo) ? 'processing' : ''}`}>
                {/* Loading Overlay */}
                {(isGeneratingAudio || isGeneratingVideo) && (
                    <div className="scene-loading-overlay">
                        <div className="scene-loading-content">
                            <div className="scene-loading-spinner"></div>
                            <p className="scene-loading-text">
                                {isGeneratingAudio ? '🎙️ Generating Audio...' : '🎬 Generating Video...'}
                            </p>
                            <p className="scene-loading-subtext">
                                {isGeneratingAudio
                                    ? 'Converting text to speech with voice instructions...'
                                    : 'Creating video from image and audio... This may take longer.'
                                }
                            </p>
                        </div>
                    </div>
                )}

                <div className="scene-header">
                    <div className="scene-header-left">
                        <h3 className="scene-title">Scene {index + 1}</h3>
                        <div className="scene-status-indicators">
                            <span style={{ color: uploadedImage ? '#667eea' : '#ccc', fontSize: '0.8rem', marginRight: '0.5rem' }}>
                                Image: {uploadedImage ? '✓' : '○'}
                            </span>
                            <span style={{ color: audioGenerated ? '#667eea' : '#ccc', fontSize: '0.8rem', marginRight: '0.5rem' }}>
                                Audio: {audioGenerated ? (uploadedAudio ? '📁' : '🎤') : '○'}
                            </span>
                            <span style={{ color: videoGenerated ? '#667eea' : '#ccc', fontSize: '0.8rem' }}>
                                Video: {videoGenerated ? '✓' : '○'}
                            </span>
                        </div>
                    </div>
                    <div className="scene-header-right">
                        <button
                            className="collapse-button"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            title={isCollapsed ? "Expand Scene" : "Collapse Scene"}
                        >
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                        <button
                            className="remove-scene"
                            onClick={() => onRemove(index)}
                            title="Remove Scene"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <>
                        <div className="scene-content">
                            <textarea
                                className="scene-textarea"
                                placeholder="Enter your scene description or dialogue here..."
                                value={scene.text || ''}
                                onChange={handleTextChange}
                                disabled={isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            />
                        </div>

                        <div className="scene-controls">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="file-input"
                                id={`image-upload-${index}`}
                                disabled={isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            />
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={handleAudioUpload}
                                className="file-input"
                                id={`audio-upload-${index}`}
                                disabled={isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            />
                            <button
                                className={`control-button upload-button ${(isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo) ? 'disabled' : ''}`}
                                onClick={() => document.getElementById(`image-upload-${index}`).click()}
                                title="Upload Image"
                                disabled={isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            >
                                <ImagePlus size={18} />
                                <span>Upload Image</span>
                            </button>

                            <button
                                className="control-button generate-image-button"
                                onClick={showImageGenerationModalHandler}
                                title="Generate Image from Text"
                                disabled={isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            >
                                <Wand2 size={20} />
                                <span>Generate Image</span>
                            </button>

                            <button
                                className={`control-button upload-button ${(isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo) ? 'disabled' : ''}`}
                                onClick={() => document.getElementById(`audio-upload-${index}`).click()}
                                title="Upload Audio File"
                                disabled={isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            >
                                <Upload size={18} />
                                <span>Upload Audio</span>
                            </button>

                            <MicrophoneRecorder
                                onAudioRecorded={handleRecordedAudio}
                                disabled={isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                                storyId={storyId}
                                sceneId={scene.id}
                                className="scene-microphone-recorder"
                            />

                            <button
                                className={`control-button audio-button ${isGeneratingAudio ? 'loading' : ''}`}
                                onClick={generateAudio}
                                title={isGeneratingAudio ? "Generating Audio..." : "Generate Audio"}
                                disabled={!scene.text || isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            >
                                {isGeneratingAudio ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <Mic size={20} />
                                        <span>Generate Audio</span>
                                    </>
                                )}
                            </button>

                            <button
                                className={`control-button video-button ${isGeneratingVideo ? 'loading' : ''}`}
                                onClick={showVideoGenerationModal}
                                title={isGeneratingVideo ? "Generating Video..." : "Generate Video (requires text, image, and audio)"}
                                disabled={!scene.text || !uploadedImage || !audioGenerated || isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            >
                                {isGeneratingVideo ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <Film size={20} />
                                        <span>Generate Video</span>
                                    </>
                                )}
                            </button>

                            <button
                                className="control-button preview-button"
                                onClick={openPreview}
                                title="Preview Video"
                                disabled={isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                            >
                                <PlayCircle size={20} />
                                <span>Preview</span>
                            </button>

                            <button
                                className="control-button sound-mixer-button"
                                onClick={() => setShowSoundMixerModal(true)}
                                title="Sound Mixer (Experimental)"
                                disabled={!audioGenerated || isGeneratingAudio || isGeneratingVideo || isAnySceneGenerating || isMergingFinalVideo}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <Settings size={18} />
                                <span>Sound Mixer</span>
                                <div style={{
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    background: '#e74c3c',
                                    color: 'white',
                                    fontSize: '0.6rem',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    fontWeight: 'bold'
                                }}>
                                    BETA
                                </div>
                            </button>
                        </div>

                        {uploadedImage && (
                            <div style={{ marginTop: '1rem' }}>
                                <img
                                    src={uploadedImage}
                                    alt="Uploaded scene"
                                    style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px' }}
                                />
                            </div>
                        )}

                        {/* Audio Preview */}
                        {audioGenerated && (
                            <div className="audio-preview-container">
                                <div className="audio-preview-header">
                                    <p className="audio-preview-title">
                                        🎵 Generated Audio Preview:
                                    </p>
                                </div>
                                <audio
                                    className="audio-player"
                                    controls
                                    preload="metadata"
                                    key={generatedAudioUrl + '_' + Date.now()}
                                >
                                    <source src={`${generatedAudioUrl}?t=${Date.now()}`} type="audio/mp3" />
                                    Your browser does not support the audio element.
                                </audio>
                                <p className="audio-preview-text">
                                    Preview: "{scene.text?.substring(0, 40)}..."
                                </p>
                            </div>
                        )}
                    </>
                )}

                {isCollapsed && scene.text && (
                    <div className="scene-collapsed-preview">
                        <p className="collapsed-text">
                            "{scene.text.substring(0, 80)}..."
                        </p>
                    </div>
                )}
            </div>

            {/* Multi-Frame Animation Modal */}
            <MultiFrameAnimationModal
                isOpen={showAnimationModal}
                onClose={() => setShowAnimationModal(false)}
                onGenerate={handleMultiFrameAnimationGenerate}
                isGenerating={isGeneratingVideo}
                sceneIndex={index}
                audioDuration={scene.audioDuration || 5}
                initialSettings={multiFrameAnimationSettings || animationSettings}
            />

            {/* Image Generation Modal */}
            {showImageGenerationModal && (
                <div className="modal-overlay" onClick={() => setShowImageGenerationModal(false)}>
                    <div className="modal-content image-generation-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">🎨 Generate Image - Scene {index + 1}</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowImageGenerationModal(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="image-generation-content">
                            <div className="image-generation-left">
                                {/* Visual Prompt */}
                                <div className="setting-group">
                                    <label className="setting-label">Visual Prompt:</label>
                                    <textarea
                                        className="setting-textarea"
                                        placeholder="Describe the image you want to generate..."
                                        value={imageGenerationSettings.visualPrompt}
                                        onChange={(e) => updateImageGenerationSetting('visualPrompt', e.target.value)}
                                        rows={4}
                                    />
                                    <button
                                        className="auto-generate-prompt-button"
                                        onClick={autoGenerateVisualPrompt}
                                        disabled={!scene.text?.trim() || imageGenerationSettings.isGeneratingPrompt}
                                        style={{
                                            marginTop: '0.5rem',
                                            padding: '0.5rem',
                                            backgroundColor: '#4a9eff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: imageGenerationSettings.isGeneratingPrompt ? 'not-allowed' : 'pointer',
                                            opacity: imageGenerationSettings.isGeneratingPrompt ? 0.6 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '36px',
                                            height: '36px'
                                        }}
                                        title="Auto-generate visual prompt from scene text"
                                    >
                                        {imageGenerationSettings.isGeneratingPrompt ? (
                                            <div className="spinner" />
                                        ) : (
                                            <Wand2 size={16} />
                                        )}
                                    </button>
                                </div>

                                {/* Negative Prompt */}
                                <div className="setting-group">
                                    <label className="setting-label">Negative Prompt:</label>
                                    <textarea
                                        className="setting-textarea"
                                        placeholder="Describe what you don't want in the image..."
                                        value={imageGenerationSettings.negativePrompt}
                                        onChange={(e) => updateImageGenerationSetting('negativePrompt', e.target.value)}
                                        rows={2}
                                    />
                                </div>

                                {/* Model Selection */}
                                <div className="setting-group">
                                    <label className="setting-label">Gemini Model:</label>
                                    <select
                                        className="setting-select"
                                        value={imageGenerationSettings.selectedModel}
                                        onChange={(e) => updateImageGenerationSetting('selectedModel', e.target.value)}
                                    >
                                        {geminiModels.map(model => (
                                            <option key={model.id} value={model.id}>
                                                {model.name} - {model.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Image Dimensions */}
                                <div className="setting-group">
                                    <label className="setting-label">Image Dimensions:</label>
                                    <select
                                        className="setting-select"
                                        value={`${imageGenerationSettings.width}x${imageGenerationSettings.height}`}
                                        onChange={(e) => {
                                            const [width, height] = e.target.value.split('x').map(Number);
                                            updateImageGenerationSetting('width', width);
                                            updateImageGenerationSetting('height', height);
                                        }}
                                    >
                                        {imageDimensions.map(dim => (
                                            <option key={`${dim.width}x${dim.height}`} value={`${dim.width}x${dim.height}`}>
                                                {dim.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Reference Images from Previous Scenes */}
                                {allScenes && allScenes.length > 0 && (
                                    <div className="setting-group">
                                        <label className="setting-label">Reference from Previous Scenes:</label>
                                        <div className="reference-images-grid">
                                            <div
                                                className={`reference-image-option ${!imageGenerationSettings.selectedSceneImage ? 'selected' : ''}`}
                                                onClick={() => updateImageGenerationSetting('selectedSceneImage', null)}
                                            >
                                                <div className="reference-image-placeholder">
                                                    <span>No Reference</span>
                                                </div>
                                            </div>
                                            {allScenes.map((sceneItem, sceneIndex) => (
                                                sceneItem.image && sceneIndex !== index && sceneItem.storyId === storyId && (
                                                    <div
                                                        key={sceneIndex}
                                                        className={`reference-image-option ${imageGenerationSettings.selectedSceneImage === sceneItem.id ? 'selected' : ''}`}
                                                        onClick={() => updateImageGenerationSetting('selectedSceneImage', sceneItem.id)}
                                                    >
                                                        <img
                                                            src={sceneItem.image}
                                                            alt={`Scene ${sceneIndex + 1}`}
                                                            className="reference-image"
                                                        />
                                                        <span className="reference-label">Scene {sceneIndex + 1}</span>
                                                        <button
                                                            className="use-image-button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setUploadedImage(sceneItem.image);
                                                                onUpdate(index, { ...scene, image: sceneItem.image });
                                                                setShowImageGenerationModal(false);
                                                            }}
                                                            title="Use this image directly"
                                                        >
                                                            Use Image
                                                        </button>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Generate Button */}
                                <div className="setting-group">
                                    <button
                                        className="generate-preview-button"
                                        onClick={generateImagePreview}
                                        disabled={!imageGenerationSettings.visualPrompt.trim() || imageGenerationSettings.isGenerating}
                                    >
                                        {imageGenerationSettings.isGenerating ? (
                                            <>
                                                <div className="spinner" />
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Eye size={20} />
                                                <span>Generate Preview</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="image-generation-right">
                                <div className="preview-area">
                                    <h4 className="preview-title">Preview</h4>
                                    <div className="preview-container">
                                        {imageGenerationSettings.isGenerating ? (
                                            <div className="preview-loading">
                                                <div className="preview-spinner"></div>
                                                <p>Generating your image...</p>
                                            </div>
                                        ) : imageGenerationSettings.generatedPreview ? (
                                            <>
                                                <img
                                                    src={imageGenerationSettings.generatedPreview}
                                                    alt="Generated preview"
                                                    className="preview-image"
                                                />
                                                <div className="preview-info">
                                                    <p>Model: {geminiModels.find(m => m.id === imageGenerationSettings.selectedModel)?.name}</p>
                                                    <p>Size: {imageGenerationSettings.width} × {imageGenerationSettings.height}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="preview-placeholder">
                                                <Wand2 size={48} />
                                                <p>Click "Generate Preview" to see your image</p>
                                            </div>
                                        )}
                                    </div>

                                    {imageGenerationSettings.generatedPreview && !imageGenerationSettings.isGenerating && (
                                        <button
                                            className="accept-image-button"
                                            onClick={acceptGeneratedImage}
                                        >
                                            <Check size={20} />
                                            <span>Accept & Use This Image</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPreview && (
                <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="modal-content preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Scene {index + 1} Preview</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowPreview(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <video
                                className="video-player"
                                controls
                                preload="metadata"
                                poster={uploadedImage}
                                autoPlay={false}
                                muted={false}
                                key={generatedVideoUrl}
                                onError={(e) => {
                                    console.error('Video error:', e);
                                    console.error('Video URL:', generatedVideoUrl);
                                    console.error('Video element:', e.target);
                                }}
                                onLoadedMetadata={(e) => {
                                    console.log('Video metadata loaded:', {
                                        duration: e.target.duration,
                                        videoWidth: e.target.videoWidth,
                                        videoHeight: e.target.videoHeight,
                                        url: generatedVideoUrl
                                    });
                                }}
                                onLoadStart={() => console.log('Video load started')}
                                onCanPlay={(e) => {
                                    console.log('Video can play');
                                }}
                                onWaiting={() => console.log('Video waiting...')}
                                onPlay={() => console.log('Video started playing')}
                                onPause={() => console.log('Video paused')}
                                style={{
                                    width: '100%',
                                    maxHeight: '500px',
                                    backgroundColor: '#000',
                                    borderRadius: '8px'
                                }}
                            >
                                {generatedVideoUrl && <source src={`${generatedVideoUrl}?t=${Date.now()}`} type="video/mp4" />}
                                Your browser does not support the video tag.
                            </video>

                            {/* Debug Information */}
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                color: '#666'
                            }}>
                                <p style={{ margin: '0 0 0.25rem 0' }}>
                                    Preview for: "{scene.text?.substring(0, 50)}..."
                                </p>

                                {generatedVideoUrl && (
                                    <div style={{
                                        marginTop: '0.25rem',
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: '#d4edda',
                                        borderRadius: '4px',
                                        color: '#155724',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                    }}>
                                        ✅ Video loaded successfully (58.8s, 1280×720) - Click play to watch!
                                    </div>
                                )}

                                {generatedVideoUrl && (
                                    <details style={{ marginTop: '0.25rem' }}>
                                        <summary style={{ cursor: 'pointer', fontSize: '0.7rem', color: '#999' }}>
                                            Debug Info
                                        </summary>
                                        <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                            <p>Video URL: {generatedVideoUrl}</p>
                                            <p>Has Image: {uploadedImage ? 'Yes' : 'No'}</p>
                                            <p>Animation: {animationSettings?.type || 'Unknown'}</p>
                                        </div>
                                    </details>
                                )}

                                {!generatedVideoUrl && (
                                    <div style={{
                                        color: '#e74c3c',
                                        fontWeight: '500',
                                        marginTop: '0.25rem'
                                    }}>
                                        ⚠️ No video URL available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sound Mixer Modal */}
            <SoundMixerModal
                show={showSoundMixerModal}
                onClose={() => setShowSoundMixerModal(false)}
                scene={scene}
                index={index}
                storyId={storyId}
                generatedAudioUrl={generatedAudioUrl}
            />
        </>
    );
};

// Main App Component
function AppContent() {
    const { toast } = useToast();
    // Helper function to load data from localStorage
    const loadFromLocalStorage = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        } catch (error) {
            console.warn('Error loading from localStorage:', error);
            // If parsing fails, clear the corrupted data
            try {
                localStorage.removeItem(key);
                console.log(`Cleared corrupted localStorage key: ${key}`);
            } catch (clearError) {
                console.warn('Error clearing localStorage:', clearError);
            }
        }
        return defaultValue;
    };

    // Helper function to get localStorage usage info
    const getLocalStorageUsage = () => {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            return {
                used: total,
                usedMB: (total / (1024 * 1024)).toFixed(2),
                // Most browsers limit localStorage to 5-10MB
                percentUsed: ((total / (5 * 1024 * 1024)) * 100).toFixed(1)
            };
        } catch (error) {
            return { used: 0, usedMB: '0', percentUsed: '0' };
        }
    };

    // Helper function to save data to localStorage
    const saveToLocalStorage = (key, data) => {
        try {
            // For scenes, we need to optimize the data to avoid quota exceeded errors
            if (key === 'storyline-studio-scenes') {
                const minimalData = data.map(scene => ({
                    id: scene.id,
                    text: scene.text,
                    hasAudio: scene.hasAudio,
                    hasVideo: scene.hasVideo,
                    audioFilename: scene.audioFilename,
                    videoFilename: scene.videoFilename,
                    storyId: scene.storyId,
                    voice: scene.voice,
                    // Keep only essential URLs (server-hosted files, not data URIs)
                    audioUrl: scene.audioUrl && !scene.audioUrl.startsWith('data:') ? scene.audioUrl : null,
                    videoUrl: scene.videoUrl && !scene.videoUrl.startsWith('data:') ? scene.videoUrl : null,
                    image: scene.image && !scene.image.startsWith('data:') ? scene.image : null,
                    audioDuration: scene.audioDuration,
                    videoDuration: scene.videoDuration
                    // No animation settings or other large data to minimize storage
                }));
                
                const dataString = JSON.stringify(minimalData);
                console.log(`Saving scenes to localStorage: ${(dataString.length / 1024).toFixed(2)}KB`);
                localStorage.setItem(key, dataString);
            } else {
                localStorage.setItem(key, JSON.stringify(data));
            }
        } catch (error) {
            console.warn('Error saving to localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                // Try to clear some space and retry with minimal data
                console.warn('localStorage quota exceeded, attempting to save minimal scene data...');
                try {
                    if (key === 'storyline-studio-scenes') {
                        const minimalData = data.map(scene => ({
                            id: scene.id,
                            text: scene.text,
                            hasAudio: scene.hasAudio,
                            hasVideo: scene.hasVideo,
                            audioFilename: scene.audioFilename,
                            videoFilename: scene.videoFilename,
                            storyId: scene.storyId,
                            voice: scene.voice,
                            // Keep only essential URLs (server-hosted files, not data URIs)
                            audioUrl: scene.audioUrl && !scene.audioUrl.startsWith('data:') ? scene.audioUrl : null,
                            videoUrl: scene.videoUrl && !scene.videoUrl.startsWith('data:') ? scene.videoUrl : null,
                            image: scene.image && !scene.image.startsWith('data:') ? scene.image : null,
                            audioDuration: scene.audioDuration,
                            videoDuration: scene.videoDuration
                            // No animation settings or other large data to minimize storage
                        }));
                        localStorage.setItem(key, JSON.stringify(minimalData));
                        console.log('Successfully saved minimal scene data to localStorage');
                    } else {
                        localStorage.setItem(key, JSON.stringify(data));
                    }
                } catch (retryError) {
                    console.error('Failed to save even minimal data to localStorage:', retryError);
                }
            }
        }
    };

    // Helper function to migrate/cleanup scene data
    const migrateSceneData = (scenes) => {
        return scenes.map((scene, index) => {
            // Determine if scene has video based on multiple indicators
            const hasVideoData = !!(
                scene.hasVideo || 
                scene.videoUrl || 
                scene.videoFilename ||
                scene.multiFrameAnimationSettings ||
                scene.animationSettings
            );
            
            // Determine if scene has audio based on multiple indicators  
            const hasAudioData = !!(
                scene.hasAudio || 
                scene.audioUrl || 
                scene.audioFilename
            );

            console.log(`Migrating Scene ${index + 1}:`, {
                originalHasVideo: scene.hasVideo,
                originalVideoUrl: !!scene.videoUrl,
                originalVideoFilename: !!scene.videoFilename,
                hasMultiFrameSettings: !!scene.multiFrameAnimationSettings,
                hasAnimationSettings: !!scene.animationSettings,
                calculatedHasVideo: hasVideoData,
                originalHasAudio: scene.hasAudio,
                calculatedHasAudio: hasAudioData
            });

            // Reconstruct URLs for server-hosted files if they're missing but filenames exist
            let audioUrl = scene.audioUrl;
            let videoUrl = scene.videoUrl;
            let imageUrl = scene.image;

            if (!audioUrl && scene.audioFilename && scene.storyId) {
                audioUrl = `http://localhost:8000/files/${scene.storyId}/audios/${scene.audioFilename}`;
                console.log(`Reconstructed audio URL for scene ${index + 1}:`, audioUrl);
            }

            if (!videoUrl && scene.videoFilename && scene.storyId) {
                videoUrl = `http://localhost:8000/files/${scene.storyId}/videos/${scene.videoFilename}`;
                console.log(`Reconstructed video URL for scene ${index + 1}:`, videoUrl);
            }

            return {
                id: scene.id || Date.now(),
                text: scene.text || '',
                image: imageUrl,
                imageFilename: scene.imageFilename || null,
                hasAudio: hasAudioData,
                hasVideo: hasVideoData,
                audioUrl: audioUrl,
                videoUrl: videoUrl,
                audioFilename: scene.audioFilename || null,
                videoFilename: scene.videoFilename || null,
                audioDuration: scene.audioDuration || null,
                videoDuration: scene.videoDuration || null,
                animationSettings: scene.animationSettings || null,
                multiFrameAnimationSettings: scene.multiFrameAnimationSettings || null,
                storyId: scene.storyId || null,
                voice: scene.voice || 'alloy'
            };
        });
    };

    // Initialize state with localStorage data
    const [scenes, setScenesState] = useState(() => {
        console.log('Initializing scenes from localStorage...');
        const usage = getLocalStorageUsage();
        console.log(`LocalStorage usage: ${usage.usedMB}MB (${usage.percentUsed}%)`);
        
        const rawScenes = loadFromLocalStorage('storyline-studio-scenes', []);
        console.log('Raw scenes from localStorage:', rawScenes);
        const migratedScenes = migrateSceneData(rawScenes);
        console.log('Migrated scenes:', migratedScenes);
        
        // Save the migrated data back to localStorage if it was modified
        if (JSON.stringify(rawScenes) !== JSON.stringify(migratedScenes)) {
            console.log('Saving migrated scenes back to localStorage');
            saveToLocalStorage('storyline-studio-scenes', migratedScenes);
            
            const newUsage = getLocalStorageUsage();
            console.log(`LocalStorage usage after migration: ${newUsage.usedMB}MB (${newUsage.percentUsed}%)`);
        }
        return migratedScenes;
    });
    const [isAnySceneGenerating, setIsAnySceneGenerating] = useState(false);
    const [isMergingFinalVideo, setIsMergingFinalVideo] = useState(false);
    const [selectedVoice, setSelectedVoiceState] = useState(() =>
        loadFromLocalStorage('storyline-studio-selected-voice', 'alloy')
    );

    // Debug logging for selectedVoice
    console.log('Current selectedVoice state:', selectedVoice);

    const [voiceInstructions, setVoiceInstructionsState] = useState(() =>
        loadFromLocalStorage('storyline-studio-voice-instructions',
            '🎙️ Narration Instruction (Adaptive Delivery)\n\nAccent: Neutral Indian English, clear and grounded.\n\nTone: Serious, but with subtle shifts — reflective at the start, energetic in the middle, then darker toward the end.\n\nMood: Gloomy undertone throughout, but with sparks of energy that echo his fleeting highs.\n\nDelivery Flow (per story beat):\n\nOpening (reflective, steady pace)\n"Interviews, fan messages, and public appearances filled his days."\n→ Calm, matter-of-fact, almost weary.\n\n"Initially, he responded to fans, humble and grateful."\n→ Gentle, softened voice, slower.\n\nRising Admiration (quicker, more engaged)\n"He felt alive, powerful, adored. He reveled in praise, each view and comment inflating his pride. Even small compliments felt like treasures."\n→ Increase pacing slightly, add a touch of brightness in tone — but not joyous, rather intoxicated.\n\nThe High (confident, energetic rhythm)\n"The world seemed to obey him. Music flowed effortlessly. The feeling was intoxicating."\n→ Crisp delivery, medium-fast pace, a hint of wonder — but with a shadow underneath.\n\nThe Shift (slower, darker again)\n"He started imagining bigger dreams, larger stages, more recognition."\n→ Slight pause between phrases, like ambition swelling.\n\n"For a while, life felt perfect, magical, unstoppable."\n→ Deliver with restrained intensity — the pace slows, voice lowers at "unstoppable," foreshadowing collapse.\n\n⚖️ Overall rhythm: Not monotone slow — instead, it rises with his pride and falls back into gloom, mirroring the story arc.'
        )
    );
    const [storyId, setStoryIdState] = useState(() => {
        // Load storyId from localStorage or generate a new one
        const existingId = loadFromLocalStorage('storyline-studio-story-id', null);
        if (existingId) {
            return existingId;
        } else {
            const newId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            saveToLocalStorage('storyline-studio-story-id', newId);
            return newId;
        }
    });

    // Wrapper function to save storyId to localStorage when it changes
    const setStoryId = (newStoryId) => {
        setStoryIdState(newStoryId);
        saveToLocalStorage('storyline-studio-story-id', newStoryId);
    };

    // Wrapper functions to save to localStorage when state changes
    const setScenes = (newScenes) => {
        if (typeof newScenes === 'function') {
            // Handle functional updates
            setScenesState(prevScenes => {
                const updatedScenes = newScenes(prevScenes);
                console.log('Saving updated scenes to localStorage (functional):', updatedScenes);
                saveToLocalStorage('storyline-studio-scenes', updatedScenes);
                return updatedScenes;
            });
        } else {
            console.log('Saving new scenes to localStorage (direct):', newScenes);
            setScenesState(newScenes);
            saveToLocalStorage('storyline-studio-scenes', newScenes);
        }
    };

    const setVoiceInstructions = (newInstructions) => {
        setVoiceInstructionsState(newInstructions);
        saveToLocalStorage('storyline-studio-voice-instructions', newInstructions);
    };

    const setSelectedVoice = (newVoice) => {
        setSelectedVoiceState(newVoice);
        saveToLocalStorage('storyline-studio-selected-voice', newVoice);
    };

    // OpenAI supported voices
    const openAIVoices = [
        { id: 'alloy', name: 'Alloy', description: 'Balanced and versatile', provider: 'openai' },
        { id: 'echo', name: 'Echo', description: 'Warm and engaging', provider: 'openai' },
        { id: 'fable', name: 'Fable', description: 'Expressive and storytelling', provider: 'openai' },
        { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative', provider: 'openai' },
        { id: 'nova', name: 'Nova', description: 'Bright and energetic', provider: 'openai' },
        { id: 'shimmer', name: 'Shimmer', description: 'Gentle and soothing', provider: 'openai' }
    ];

    // Google Gemini/WaveNet Indian voices
    // const geminiVoices = [
    //     { id: 'en-IN-Wavenet-A', name: 'Wavenet Indian Female A', description: 'Natural Indian English (Female)', provider: 'gemini' },
    //     { id: 'en-IN-Wavenet-B', name: 'Wavenet Indian Male B', description: 'Natural Indian English (Male)', provider: 'gemini' },
    //     { id: 'en-IN-Wavenet-C', name: 'Wavenet Indian Female C', description: 'Natural Indian English (Female)', provider: 'gemini' },
    //     { id: 'en-IN-Wavenet-D', name: 'Wavenet Indian Male D', description: 'Natural Indian English (Male)', provider: 'gemini' },
    //     { id: 'en-IN-Standard-A', name: 'Standard Indian Female A', description: 'Standard Indian English (Female)', provider: 'gemini' },
    //     { id: 'en-IN-Standard-B', name: 'Standard Indian Male B', description: 'Standard Indian English (Male)', provider: 'gemini' },
    //     { id: 'en-IN-Standard-C', name: 'Standard Indian Female C', description: 'Standard Indian English (Female)', provider: 'gemini' },
    //     { id: 'en-IN-Standard-D', name: 'Standard Indian Male D', description: 'Standard Indian English (Male)', provider: 'gemini' },
    //     { id: 'hi-IN-Wavenet-A', name: 'Hindi Wavenet Female A', description: 'Natural Hindi (Female)', provider: 'gemini' },
    //     { id: 'hi-IN-Wavenet-B', name: 'Hindi Wavenet Male B', description: 'Natural Hindi (Male)', provider: 'gemini' },
    //     { id: 'hi-IN-Wavenet-C', name: 'Hindi Wavenet Female C', description: 'Natural Hindi (Female)', provider: 'gemini' },
    //     { id: 'hi-IN-Wavenet-D', name: 'Hindi Wavenet Male D', description: 'Natural Hindi (Male)', provider: 'gemini' }
    // ];

    // Combined voice options
    // const allVoices = [...openAIVoices, ...geminiVoices];
    const allVoices = [...openAIVoices];

    // Initialize state with localStorage data
    useEffect(() => {
        const initializeStory = async () => {
            try {
                console.log(`Initializing story with ID: ${storyId}`);
                const response = await fetch('http://localhost:8000/init', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        story_id: storyId
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('Story initialized successfully:', result);
                } else {
                    console.error('Failed to initialize story:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error initializing story:', error);
            }
        };

        initializeStory();
    }, [storyId]); // Run whenever storyId changes

    const addScene = () => {
        if (isAnySceneGenerating || isMergingFinalVideo) {
            toast.warning('Operation In Progress', 'Please wait for the current generation to complete before adding a new scene.');
            return;
        }
        setScenes([...scenes, {
            id: Date.now(),
            text: '',
            image: null,
            imageFilename: null,
            hasAudio: false,
            hasVideo: false,
            audioUrl: null,
            videoUrl: null,
            audioFilename: null,
            videoFilename: null,
            audioDuration: null,
            videoDuration: null,
            animationSettings: null,
            multiFrameAnimationSettings: null,
            storyId: storyId,
            voice: selectedVoice
        }]);
    };

    const updateScene = (index, updatedScene) => {
        console.log(`Updating scene ${index + 1}:`, {
            hasVideo: updatedScene.hasVideo,
            hasAudio: updatedScene.hasAudio,
            videoUrl: !!updatedScene.videoUrl,
            audioUrl: !!updatedScene.audioUrl,
            hasMultiFrameSettings: !!updatedScene.multiFrameAnimationSettings,
            fullScene: updatedScene
        });
        const newScenes = [...scenes];
        newScenes[index] = updatedScene;
        setScenes(newScenes);
    };

    const removeScene = (index) => {
        if (isAnySceneGenerating || isMergingFinalVideo) {
            toast.warning('Operation In Progress', 'Please wait for the current generation to complete before removing a scene.');
            return;
        }
        setScenes(scenes.filter((_, i) => i !== index));
    };

    const mergeFinalVideo = async () => {
        if (isAnySceneGenerating || isMergingFinalVideo) {
            toast.warning('Operation In Progress', 'Please wait for the current generation to complete before merging the final video.');
            return;
        }

        const completedScenes = scenes.filter(scene => scene.hasVideo);
        if (completedScenes.length === 0) {
            toast.warning('No Videos Ready', 'Please generate videos for at least one scene first!');
            return;
        }

        try {
            setIsMergingFinalVideo(true);
            setIsAnySceneGenerating(true);

            // Extract scene IDs from completed scenes
            const sceneIds = completedScenes.map(scene => String(scene.id));

            // Get dimensions from the first scene's animation settings
            const firstScene = completedScenes[0];
            let width = 1280; // default
            let height = 720; // default

            if (firstScene.multiFrameAnimationSettings?.frames?.[0]?.animation) {
                width = firstScene.multiFrameAnimationSettings.frames[0].animation.width || 1280;
                height = firstScene.multiFrameAnimationSettings.frames[0].animation.height || 720;
            } else if (firstScene.animationSettings) {
                width = firstScene.animationSettings.width || 1280;
                height = firstScene.animationSettings.height || 720;
            }

            console.log(`Accumulating final video for Story ID: ${storyId} with ${completedScenes.length} scenes, dimensions: ${width}x${height}`);

            const response = await fetch('http://localhost:8000/accumulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    story_id: storyId,
                    scenes: sceneIds,
                    width: width,
                    height: height
                })
            });

            if (response.ok) {
                // Handle file download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                // Create a temporary anchor element to trigger download
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `story_${storyId}_final_video.mp4`;
                document.body.appendChild(a);
                a.click();

                // Clean up
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast.success(
                    `Final Video Generated Successfully! 🎉`,
                    `Your story video has been created and downloaded!\nStory ID: ${storyId}\nFile: story_${storyId}_final_video.mp4`,
                    { duration: 8000 }
                );
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error accumulating final video:', error);
            toast.error(
                `Final Video Generation Failed`,
                `Failed to generate final video: ${error.message}`
            );
        } finally {
            setIsMergingFinalVideo(false);
            setIsAnySceneGenerating(false);
        }
    };

    const resetAll = () => {
        if (isAnySceneGenerating || isMergingFinalVideo) {
            toast.warning('Operation In Progress', 'Please wait for the current generation to complete before resetting.');
            return;
        }

        if (window.confirm('Are you sure you want to reset all scenes? This action cannot be undone.')) {
            setScenes([]);
            setVoiceInstructions('🎙️ Narration Instruction (Adaptive Delivery)\n\nAccent: Neutral Indian English, clear and grounded.\n\nTone: Serious, but with subtle shifts — reflective at the start, energetic in the middle, then darker toward the end.\n\nMood: Gloomy undertone throughout, but with sparks of energy that echo his fleeting highs.\n\nDelivery Flow (per story beat):\n\nOpening (reflective, steady pace)\n"Interviews, fan messages, and public appearances filled his days."\n→ Calm, matter-of-fact, almost weary.\n\n"Initially, he responded to fans, humble and grateful."\n→ Gentle, softened voice, slower.\n\nRising Admiration (quicker, more engaged)\n"He felt alive, powerful, adored. He reveled in praise, each view and comment inflating his pride. Even small compliments felt like treasures."\n→ Increase pacing slightly, add a touch of brightness in tone — but not joyous, rather intoxicated.\n\nThe High (confident, energetic rhythm)\n"The world seemed to obey him. Music flowed effortlessly. The feeling was intoxicating."\n→ Crisp delivery, medium-fast pace, a hint of wonder — but with a shadow underneath.\n\nThe Shift (slower, darker again)\n"He started imagining bigger dreams, larger stages, more recognition."\n→ Slight pause between phrases, like ambition swelling.\n\n"For a while, life felt perfect, magical, unstoppable."\n→ Deliver with restrained intensity — the pace slows, voice lowers at "unstoppable," foreshadowing collapse.\n\n⚖️ Overall rhythm: Not monotone slow — instead, it rises with his pride and falls back into gloom, mirroring the story arc.');
            // Generate a new story ID on reset
            const newStoryId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            setStoryId(newStoryId);
            setSelectedVoice('alloy');
            // Clear localStorage data
            localStorage.removeItem('storyline-studio-scenes');
            localStorage.removeItem('storyline-studio-voice-instructions');
            localStorage.removeItem('storyline-studio-story-id');
            localStorage.removeItem('storyline-studio-selected-voice');

            saveToLocalStorage('storyline-studio-story-id', newStoryId);
        }
    };

    return (
        <div className="app-container">
            {/* App Bar */}
            <header className="app-bar">
                <div className="app-bar-content">
                    <div>
                        <h1>🎬 FableFrames</h1>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                            Transform your stories into captivating videos
                        </p>
                    </div>
                    <div className="story-id-display">
                        <span className="story-id-label">Story ID:</span>
                        <span className="story-id-value">{storyId}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
                <div className="scenes-container">
                    {/* Global Voice Instructions */}
                    <div className={`voice-instructions-container ${isAnySceneGenerating || isMergingFinalVideo ? 'disabled' : ''}`}>
                        <label htmlFor="voice-instructions" className="voice-instructions-label">
                            🎙️ Narration Instructions (Adaptive Delivery)
                        </label>
                        <textarea
                            id="voice-instructions"
                            className="voice-instructions-textarea"
                            placeholder="Voice instructions are pre-filled with adaptive delivery settings. You can customize them here..."
                            value={voiceInstructions}
                            onChange={(e) => setVoiceInstructions(e.target.value)}
                            rows={8}
                            disabled={isAnySceneGenerating || isMergingFinalVideo}
                        />
                        <p className="voice-instructions-help">
                            These instructions will be applied to audio generation for all scenes
                            {(isAnySceneGenerating || isMergingFinalVideo) && ' (disabled during generation)'}
                        </p>
                    </div>

                    {/* Voice Selection */}
                    <div className={`voice-selection-container ${isAnySceneGenerating || isMergingFinalVideo ? 'disabled' : ''}`}>
                        <label htmlFor="voice-selection" className="voice-selection-label">
                            🎤 Voice Selection
                        </label>
                        <select
                            id="voice-selection"
                            className="voice-selection-select"
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            disabled={isAnySceneGenerating || isMergingFinalVideo}
                        >
                            <optgroup label="OpenAI Voices">
                                {openAIVoices.map(voice => (
                                    <option key={voice.id} value={voice.id}>
                                        {voice.name} - {voice.description}
                                    </option>
                                ))}
                            </optgroup>
                            {/* <optgroup label="Google Gemini/WaveNet Voices">
                                {geminiVoices.map(voice => (
                                    <option key={voice.id} value={voice.id}>
                                        {voice.name} - {voice.description}
                                    </option>
                                ))}
                            </optgroup> */}
                        </select>
                        <p className="voice-selection-help">
                            Choose a voice for narration. This will be used for all scenes.
                            {(isAnySceneGenerating || isMergingFinalVideo) && ' (disabled during generation)'}
                        </p>
                    </div>

                    <button className="add-scene-button" onClick={addScene} disabled={isAnySceneGenerating || isMergingFinalVideo}>
                        <PlusCircle size={24} style={{ marginRight: '0.5rem' }} />
                        {isAnySceneGenerating || isMergingFinalVideo ? 'Generation in progress...' : 'Add New Scene'}
                    </button>

                    {scenes.length === 0 ? (
                        <div className="empty-state">
                            <p>No scenes yet. Click "Add New Scene" to get started!</p>
                        </div>
                    ) : (
                        scenes.map((scene, index) => (
                            <Scene
                                key={scene.id}
                                scene={scene}
                                index={index}
                                onUpdate={updateScene}
                                onRemove={removeScene}
                                globalVoiceInstructions={voiceInstructions}
                                selectedVoice={selectedVoice}
                                storyId={storyId}
                                isAnySceneGenerating={isAnySceneGenerating}
                                setIsAnySceneGenerating={setIsAnySceneGenerating}
                                isMergingFinalVideo={isMergingFinalVideo}
                                allScenes={scenes}
                            />
                        ))
                    )}

                    {scenes.length > 0 && (
                        <div className="final-controls">
                            <button
                                className="merge-button"
                                onClick={mergeFinalVideo}
                                disabled={scenes.filter(s => s.hasVideo).length === 0 || isAnySceneGenerating || isMergingFinalVideo}
                            >
                                <FileVideo size={24} style={{ marginRight: '0.5rem' }} />
                                {isMergingFinalVideo ? '🎬 Generating Final Video...' :
                                    isAnySceneGenerating ? 'Generation in progress...' : 'Generate Final Video'}
                            </button>

                            <button className="reset-button" onClick={resetAll} disabled={isAnySceneGenerating || isMergingFinalVideo}>
                                <Trash2 size={24} style={{ marginRight: '0.5rem' }} />
                                {isAnySceneGenerating || isMergingFinalVideo ? 'Generation in progress...' : 'Reset All'}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}

export default App;
