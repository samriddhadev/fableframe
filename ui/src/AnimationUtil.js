/*
Ken Burns Effect Test Cases
===========================

🔍 Test Case 1: Zoom-In + Pan-Right
- startScale: 1.0
- endScale: 1.5
- intensity: 5
- directions: ["zoom-in", "pan-right"]
👉 Gradual zoom in while panning to the right

🔍 Test Case 2: Zoom-Out + Pan-Down
- startScale: 1.5
- endScale: 1.0
- intensity: 7
- directions: ["zoom-out", "pan-down"]
👉 Starts zoomed in, zooms out, and pans downward

🔍 Test Case 3: Pan-Only Left
- startScale: 1.0
- endScale: 1.0
- intensity: 8
- directions: ["pan-left"]
👉 No zoom, strong leftward movement

🔍 Test Case 4: Zoom-In Only
- startScale: 1.0
- endScale: 2.0
- intensity: 0
- directions: ["zoom-in"]
👉 Noticeable zoom from 1× to 2×, no pan

🔍 Test Case 5: Pan-Up + Pan-Right (Diagonal)
- startScale: 1.2
- endScale: 1.2
- intensity: 6
- directions: ["pan-up", "pan-right"]
👉 No zoom, slides diagonally up-right
*/


const getAnimationSettings = (settings) => {
    console.log('Animation Settings:', settings);
    return settings || {};
};

const validDirections = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'];

const validateKenBurnsDirections = (directions, startScale, endScale, intensityFactor) => {
    if (!Array.isArray(directions) || directions.length === 0) return false;

    // Only keep valid directions
    const filtered = directions.filter(dir => validDirections.includes(dir));
    if (filtered.length === 0) return false;

    // Zoom is valid if start and end scales differ
    const hasZoom = filtered.includes('zoom-in') || filtered.includes('zoom-out');
    if (hasZoom && startScale === endScale) return false;

    // Pan is valid if intensityFactor > 0
    const hasPan = filtered.some(dir => dir.startsWith('pan-'));
    if (hasPan && intensityFactor <= 0) return false;

    return true;
};

export const kenBurnsFilterExpression = (settings, duration, width, height, fps) => {
    const frames = Math.floor(duration * fps);
    const animationSettings = getAnimationSettings(settings);
    console.log('Ken Burns Animation Settings:', animationSettings);

    const startScale = Math.max(0.1, Math.min(3.0, animationSettings.startScale || 1.0));
    const endScale = Math.max(0.1, Math.min(3.0, animationSettings.endScale || startScale + 0.1));

    // Intensity: 0 → no pan, 1 → full crop window pan
    const intensityFactor = Math.min(1, Math.max(0, (animationSettings.intensity || 1) / 10));

    let d = 1;
    let zoomExpr = startScale.toString();
    let xExpr = `iw/2-(iw/zoom/2)`;
    let yExpr = `ih/2-(ih/zoom/2)`;

    const directions = Array.isArray(animationSettings.direction)
        ? animationSettings.direction
        : [animationSettings.direction];

    if (!validateKenBurnsDirections(directions, startScale, endScale, intensityFactor)) {
        console.warn('Invalid or empty directions, using static zoom.');
        return `zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}`;
    }

    // Handle pan-only animations
    if (
        directions.length === 1 &&
        ['pan-left', 'pan-right', 'pan-up', 'pan-down'].includes(directions[0])
    ) {
        d = frames;
        let scaleMultiplier = 0.5; // default slight zoom if no zoom specifiedss
        if (endScale !== startScale && endScale > startScale) {
            scaleMultiplier = endScale - startScale;
        }

        let scaleFactor = 1 + scaleMultiplier; // optional, can be 1 if no zoom
        let panXExpr = `(in_w - ${width}) / 2`;  // default center
        let panYExpr = `(in_h - ${height}) / 2`; // default center

        switch (directions[0]) {
            case 'pan-left':
                panXExpr = `(in_w - ${width}) * (t/${duration} * ${intensityFactor})`;
                break;
            case 'pan-right':
                panXExpr = `(in_w - ${width}) * (1 - t/${duration} * ${intensityFactor})`;
                break;
            case 'pan-up':
                panYExpr = `(in_h - ${height}) * (t/${duration} * ${intensityFactor})`;
                break;
            case 'pan-down':
                panYExpr = `(in_h - ${height}) * (1 - t/${duration} * ${intensityFactor})`;
                break;
        }

        // Build the full FFmpeg filter expression
        const filterExpr = `scale=round(${width}*${scaleFactor}):round(${height}*${scaleFactor}),crop=${width}:${height}:${panXExpr}:${panYExpr},fps=${fps}`.replace(/\s+/g, ''); // remove whitespace for FFmpeg

        console.log('Generated filter expression:', filterExpr);
        return filterExpr;
    }
    else {
        let xShiftExpr = '';
        let yShiftExpr = '';
        // --- Zoom ---
        if (directions.includes('zoom-in')) {
            zoomExpr = `${startScale}+(${endScale}-${startScale})*on/${frames}`;
        } else if (directions.includes('zoom-out')) {
            zoomExpr = `${startScale}-(${startScale}-${endScale})*on/${frames}`;
        }

        // --- Pan ---
        if (directions.includes('pan-left')) {
            xShiftExpr = `+((iw/zoom-${width})*on/${frames}*${intensityFactor})`;
        } else if (directions.includes('pan-right')) {
            xShiftExpr = `-((iw/zoom-${width})*on/${frames}*${intensityFactor})`;
        }

        if (directions.includes('pan-up')) {
            yShiftExpr = `+((ih/zoom-${height})*on/${frames}*${intensityFactor})`;
        } else if (directions.includes('pan-down')) {
            yShiftExpr = `-((ih/zoom-${height})*on/${frames}*${intensityFactor})`;
        }

        // Build final expressions
        xExpr = `iw/2-(iw/zoom/2)${xShiftExpr}`;
        yExpr = `ih/2-(ih/zoom/2)${yShiftExpr}`;

        console.log('Generated expressions:', { zoomExpr, xExpr, yExpr, frames, duration, intensityFactor });
        // Use d=1 so zoompan filter is evaluated per output frame
        return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${d}:s=${width}x${height}:fps=${fps}`;
    }
};

export const parallaxFilterExpression = (settings, duration, width, height, fps) => {
    const animationSettings = getAnimationSettings(settings);
    const direction = animationSettings.direction;
    const speed = animationSettings.speed || 0.5;
    const frames = Math.floor(duration * fps);
    switch (direction) {
        case 'left-to-right':
            return `crop=iw*0.8:ih:x=(iw-ow)*t/${duration}:y=0`;
        case 'right-to-left':
            return `crop=iw*0.8:ih:x=(iw-ow)*(1-t/${duration}):y=0`;
        case 'top-to-bottom':
            return `crop=iw:ih*0.8:x=0:y=(ih-oh)*t/${duration}`;
        case 'bottom-to-top':
            return `crop=iw:ih*0.8:x=0:y=(ih-oh)*(1-t/${duration})`;
        default:
            return `crop=iw*0.8:ih:x=(iw-ow)*t/${duration}:y=0`; // default to left-to-right
    }
}

export const cinemagraphFilterExpression = (settings, duration, width, height, fps) => {
    const animationSettings = getAnimationSettings(settings);
    const motionIntensity = (animationSettings.intensity * 5)
    const motionIntensityDec = (animationSettings.intensity * 5)/100 || 0.05; // scale 0-20 to 0-0.1
    const loopDuration = animationSettings.loopDuration || duration;
    const frames = Math.floor(duration * fps);
    switch (animationSettings.motionType) {
        case 'subtle-zoom':
            return `zoompan=z='1+${motionIntensityDec}*sin(2*PI*((on/25)/${loopDuration}))':d=${frames}:fps=${fps}`;
        case 'wave':
            return `crop=iw:ih:x='${motionIntensity}*sin(2*PI*(t/${loopDuration}))':y=0`;
        case 'breathe':
            return `scale=iw*(1+${motionIntensity}/100*sin(2*PI*(t/${loopDuration}))):ih*(1+${motionIntensity}/100*sin(2*PI*(t/${loopDuration})))`;
    }
}

export const dollyzoomFilterExpression = (settings, duration, width, height, fps) => {
    const animationSettings = getAnimationSettings(settings);
    const fovStart = animationSettings.startFov;
    const fovEnd = animationSettings.endFov;
    const scaleStart = 50 / fovStart;
    const scaleEnd = 50 / fovEnd;
    const frames = Math.floor(duration * fps);

    return `zoompan=z='${scaleStart}+(${scaleEnd}-${scaleStart})*in/${frames}':d=${frames}:fps=${fps}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
}