import { useState, useEffect, useRef } from 'react';
import type { SpriteFile } from '../types';
import { defaultSkeleton } from '../utils/skeleton';

interface SkinPreviewTabProps {
    modifiedBlobs: Record<string, Blob>;
    files: SpriteFile[];
}

export function SkinPreviewTab({ modifiedBlobs, files }: SkinPreviewTabProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Debug tools for finding offsets
    const [debugOffsetX, setDebugOffsetX] = useState(0);
    const [debugOffsetY, setDebugOffsetY] = useState(-14);
    const [debugZoom, setDebugZoom] = useState(8);

    // Image cache
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});

    useEffect(() => {
        const loadImages = async () => {
            const promises = defaultSkeleton.map(bone => {
                return new Promise<void>((resolve) => {
                    // Get blob URL or fallback URL
                    const blob = modifiedBlobs[bone.spriteName];
                    const url = blob 
                        ? URL.createObjectURL(blob) 
                        : files.find(f => f.name === bone.spriteName)?.path;

                    if (!url) {
                        resolve();
                        return;
                    }

                    const img = new Image();
                    img.src = url;
                    img.onload = () => {
                        imagesRef.current[bone.spriteName] = img;
                        resolve();
                    };
                    img.onerror = () => resolve();
                });
            });

            await Promise.all(promises);
            drawSkeleton();
        };

        loadImages();
    }, [modifiedBlobs, files, debugOffsetX, debugOffsetY, debugZoom]);

    const drawSkeleton = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Center point
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.save();
        ctx.translate(cx, cy);

        // Scale up for better visibility
        ctx.scale(debugZoom, debugZoom);

        // Turn off anti-aliasing for pixel art
        ctx.imageSmoothingEnabled = false;

        // Phase 2: We only draw UpTorso and Head for calibration
        const upTorso = defaultSkeleton.find(b => b.id === 'upTorso');
        const head = defaultSkeleton.find(b => b.id === 'head');

        // Draw Torso
        if (upTorso && imagesRef.current[upTorso.spriteName]) {
            const img = imagesRef.current[upTorso.spriteName];
            ctx.save();
            // Draw torso exactly at center (0,0 is now center of torso pivot)
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            ctx.fillStyle = 'red';
            ctx.font = '3px Arial';
            ctx.fillText(upTorso.spriteName, img.width / 2 + 2, 0);
            ctx.restore();
        }

        // Draw Head connected to Torso using Debug Offsets
        if (head && imagesRef.current[head.spriteName]) {
            const img = imagesRef.current[head.spriteName];
            ctx.save();
            // Move to torso pivot
            ctx.translate(0, 0); 
            // Move by debug offset
            ctx.translate(debugOffsetX, debugOffsetY);
            // Draw head centered at this offset
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            ctx.fillStyle = 'lime';
            ctx.font = '3px Arial';
            ctx.fillText(head.spriteName, img.width / 2 + 2, 0);
            ctx.restore();
        }

        ctx.restore();
    };

    return (
        <main className="center-canvas skin-preview-tab">
            <div className="preview-main-area">
                <div className="preview-canvas-container" style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                    <canvas 
                        ref={canvasRef}
                        className="preview-canvas-main"
                        width={600}
                        height={600}
                        style={{ border: '1px solid #ccc', backgroundColor: '#333', borderRadius: 8 }}
                    />
                </div>
                
                {/* Debug Panel */}
                <div className="preview-debug-panel">
                    <h4>Debug Offsets</h4>
                    <div className="debug-control">
                        <label>X Offset: {debugOffsetX}</label>
                        <input 
                            type="range" 
                            min="-50" max="50" 
                            value={debugOffsetX} 
                            onChange={e => setDebugOffsetX(Number(e.target.value))} 
                        />
                    </div>
                    <div className="debug-control">
                        <label>Y Offset: {debugOffsetY}</label>
                        <input 
                            type="range" 
                            min="-50" max="50" 
                            value={debugOffsetY} 
                            onChange={e => setDebugOffsetY(Number(e.target.value))} 
                        />
                    </div>
                    <div className="debug-control">
                        <label>Zoom: {debugZoom}x</label>
                        <input 
                            type="range" 
                            min="1" max="20" 
                            value={debugZoom} 
                            onChange={e => setDebugZoom(Number(e.target.value))} 
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
