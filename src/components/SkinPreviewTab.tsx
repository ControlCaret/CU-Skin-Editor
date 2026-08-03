import { useRef, useState } from 'react';
import type { SpriteFile } from '../types';
import { animations } from '../utils/animations';
import { SkinPreviewCanvas } from './SkinPreviewCanvas';

interface SkinPreviewTabProps {
    modifiedBlobs: Record<string, Blob>;
    files: SpriteFile[];
}

export function SkinPreviewTab({ modifiedBlobs, files }: SkinPreviewTabProps) {
    const [zoom, setZoom] = useState(3);
    const [activeAnim, setActiveAnim] = useState<string>('walk');
    const autoZoomDoneRef = useRef<boolean>(false);

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
                <button onClick={() => { autoZoomDoneRef.current = false; setZoom(3); }} className="zoom-btn-auto">Auto</button>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="zoom-btn">-</button>
                <input
                    type="range"
                    min="1" max="100" step="1"
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className="zoom-slider"
                />
                <span className="zoom-text" style={{ width: '4ch', textAlign: 'center' }}>{zoom}x</span>
                <button onClick={() => setZoom(z => Math.min(10, z + 0.5))} className="zoom-btn">+</button>
            </div>
        </main>
    );
}
