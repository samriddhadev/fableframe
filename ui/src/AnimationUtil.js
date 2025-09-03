const getAnimationSettings = (settings) => {
    console.log('Animation Settings:', settings);
    return settings || {};
};

export const kenBurnsFilterExpression = (settings, duration, width, height, fps) => {
    const frames = Math.floor(duration * fps);
    const animationSettings = getAnimationSettings(settings);
    console.log('Ken Burns Animation Settings:', animationSettings);

    const startScale = Math.max(0.1, Math.min(3.0, animationSettings.startScale || 1.0));
    const endScale = Math.max(0.1, Math.min(3.0, animationSettings.endScale || startScale + 0.1));

    // Intensity: 0 → no pan, 1 → full crop window pan
    const intensityFactor = Math.min(1, Math.max(0, animationSettings.intensity || 1));

    // Default expressions (centered, no zoom)
    let zoomExpr = startScale.toString();
    let xExpr = 'iw/2-(iw/zoom/2)';
    let yExpr = 'ih/2-(ih/zoom/2)';

    const directions = Array.isArray(animationSettings.direction)
        ? animationSettings.direction
        : [animationSettings.direction];

    const num_directions = directions.length;
    console.log('directions:', directions, 'num_directions:', num_directions);
    if (num_directions === 0) {
        // No directions specified, return static zoom
        return `zoompan=z='${startScale}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${width}x${height}:fps=${fps}`;
    }
    if (num_directions === 1) {
        // ---- Pan ----
        let xShift = '0';
        let yShift = '0';

        let d = frames;

        // ---- Zoom ----
        if (directions.includes('zoom-in')) {
            zoomExpr = `${startScale}+(${endScale}-${startScale})*in/${frames}`;
            d = 1;
        }
        else if (directions.includes('zoom-out')) {
            zoomExpr = `${startScale}-(${startScale}-${endScale})*in/${frames}`;
            d = 1;
        }
        // Move across the crop window scaled by intensityFactor
        else if (directions.includes('pan-left')) {
            xShift = `(${width ? 'iw/zoom' : 'iw/zoom'}-${width})*in/${frames}*${intensityFactor}`;
        }
        else if (directions.includes('pan-right')) {
            xShift = `-(${width ? 'iw/zoom' : 'iw/zoom'}-${width})*in/${frames}*${intensityFactor}`;
        }
        else if (directions.includes('pan-up')) {
            yShift = `(${height ? 'ih/zoom' : 'ih/zoom'}-${height})*in/${frames}*${intensityFactor}`;
        }
        else if (directions.includes('pan-down')) {
            yShift = `-(${height ? 'ih/zoom' : 'ih/zoom'}-${height})*in/${frames}*${intensityFactor}`;
        }

        // Apply shifts to center
        xExpr = `iw/2-(iw/zoom/2)+${xShift}`;
        yExpr = `ih/2-(ih/zoom/2)+${yShift}`;

        console.log('Generated expressions:', { zoomExpr, xExpr, yExpr, frames, duration, intensityFactor });

        // Build zoompan filter
        return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${d}:s=${width}x${height}:fps=${fps}`;
    }

    return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${width}x${height}:fps=${fps}`;
};

export const parallaxFilterExpression = (settings, duration, width, height, fps) => {
    const animationSettings = getAnimationSettings(settings);
    const direction = animationSettings.direction;
    const speed = animationSettings.speed || 0.5;
    const frames = Math.floor(duration * fps);
    switch (direction) {
        case 'left-to-right':
            return `zoompan=z='1':x='iw/2-(iw/zoom/2)-${speed}*in':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps},`;
        case 'right-to-left':
            return `zoompan=z='1':x='iw/2-(iw/zoom/2)+${speed}*in':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps},`;
        case 'top-to-bottom':
            return `zoompan=z='1':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)-${speed}*in':d=${frames}:s=${width}x${height}:fps=${fps},`;
        case 'bottom-to-top':
            return `zoompan=z='1':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+${speed}*in':d=${frames}:s=${width}x${height}:fps=${fps},`;
        default:
            return `zoompan=z='1':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps},`;
    }
}

export const cinemagraphFilterExpression = (settings, duration, width, height, fps) => {
    const animationSettings = getAnimationSettings(settings);
    const motionIntensity = animationSettings.intensity * 5;
    const loopDuration = animationSettings.loopDuration || duration;
    const frames = Math.floor(duration * fps);
    switch (animationSettings.motionType) {
        case 'subtle-zoom':
            filter = `zoompan=z='1+${motionIntensity}/100*sin(2*PI*(t/${loopDuration}))':d=${frames}:fps=${fps}`;
            break;
        case 'wave':
            filter = `crop=iw:ih:x='${motionIntensity}*sin(2*PI*(t/${loopDuration}))':y=0`;
            break;
        case 'breathe':
            filter = `scale=iw*(1+${motionIntensity}/100*sin(2*PI*(t/${loopDuration}))):ih*(1+${motionIntensity}/100*sin(2*PI*(t/${loopDuration})))`;
            break;
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