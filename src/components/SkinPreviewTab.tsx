import { useState } from 'react';
import type { SpriteFile } from '../types';
import { animations } from '../utils/animations';
import { SkinPreviewCanvas } from './SkinPreviewCanvas';

// All eye sprite options (display name → filename)
const EYE_OPTIONS: { label: string; file: string }[] = [
    { label: 'Open',         file: 'experimentEyeOpen.png' },
    { label: 'Happy',        file: 'experimentEyeHappy.png' },
    { label: 'Half',         file: 'experimentEyeHalfClosed.png' },
    { label: 'HalfBack',     file: 'experimentEyeHalfClosedBack.png' },
    { label: 'Closed',       file: 'experimentEyeClosed.png' },
    { label: 'Sad',          file: 'experimentEyeSad.png' },
    { label: 'SadBack',      file: 'experimentEyeSadBack.png' },
    { label: 'Scared',       file: 'experimentEyeScared.png' },
    { label: 'ScaredBack',   file: 'experimentEyeScaredBack.png' },
    { label: 'Panic',        file: 'experimentEyePanic.png' },
    { label: 'LookBack',     file: 'experimentEyeLookBack.png' },
    { label: 'Gone',         file: 'experimentEyeGone.png' },
    { label: 'GoneHealed',   file: 'experimentEyeGoneHealed.png' },
];

interface SkinPreviewTabProps {
    modifiedBlobs: Record<string, Blob>;
    files: SpriteFile[];
    activeAnim: string;
    setActiveAnim: (anim: string) => void;
    selectedEye: string;
    setSelectedEye: (eye: string) => void;
    showNosebleed: boolean;
    setShowNosebleed: (show: boolean) => void;
}

export function SkinPreviewTab({ 
    modifiedBlobs, 
    files, 
    activeAnim, 
    setActiveAnim,
    selectedEye,
    setSelectedEye,
    showNosebleed,
    setShowNosebleed
}: SkinPreviewTabProps) {
    const [zoom, setZoom] = useState(3);
    const [autoZoomTrigger, setAutoZoomTrigger] = useState(0);

    const spriteOverrides = {
        head: 'experimentHeadBack.png',
        eyes: selectedEye,
    };

    return (
        <main className="center-canvas">
            <SkinPreviewCanvas
                modifiedBlobs={modifiedBlobs}
                files={files}
                activeAnim={activeAnim}
                zoom={zoom}
                onZoomChange={setZoom}
                width={800}
                height={800}
                className="pixel-canvas"
                style={{
                    maxWidth: '95%',
                    maxHeight: '95%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                }}
                spriteOverrides={spriteOverrides}
                showNosebleed={showNosebleed}
                autoZoomTrigger={autoZoomTrigger}
            />

            {/* Animation selector */}
            <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '60%' }}>
                {Object.keys(animations).map(anim => (
                    <button
                        key={anim}
                        onClick={() => setActiveAnim(anim)}
                        style={{
                            background: activeAnim === anim ? '#4CAF50' : 'rgba(0,0,0,0.6)',
                            border: '1px solid #555',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={e => { if (activeAnim !== anim) e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                        onMouseOut={e => { if (activeAnim !== anim) e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
                    >
                        {anim.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Zoom controls */}
            <div className="zoom-controls">
                <button onClick={() => setAutoZoomTrigger(v => v + 1)} className="zoom-btn-auto">Auto</button>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="zoom-btn">-</button>
                <input
                    type="range"
                    min="0.5" max="100" step="0.5"
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className="zoom-slider"
                />
                <span className="zoom-text" style={{ width: '4ch', textAlign: 'center' }}>{zoom}x</span>
                <button onClick={() => setZoom(z => Math.min(100, z + 0.5))} className="zoom-btn">+</button>
            </div>

            {/* Eye & Nosebleed controls — bottom-right */}
            <div style={{
                position: 'absolute',
                bottom: 56,
                right: 16,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 8,
            }}>
                {/* Nosebleed toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#ccc', fontSize: 12 }}>
                    <input
                        type="checkbox"
                        checked={showNosebleed}
                        onChange={e => setShowNosebleed(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    Nosebleed
                </label>

                {/* Eye selector */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', maxWidth: 300 }}>
                    {EYE_OPTIONS.map(opt => (
                        <button
                            key={opt.file}
                            onClick={() => setSelectedEye(opt.file)}
                            style={{
                                background: selectedEye === opt.file ? '#3b82f6' : 'rgba(0,0,0,0.6)',
                                border: '1px solid #555',
                                color: '#fff',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                transition: 'background 0.15s',
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </main>
    );
}
