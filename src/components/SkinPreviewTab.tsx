import { useState, useEffect, useRef } from 'react';
import type { SpriteFile } from '../types';
import { defaultSkeleton, poses } from '../utils/skeleton';

interface SkinPreviewTabProps {
    modifiedBlobs: Record<string, Blob>;
    files: SpriteFile[];
}

export function SkinPreviewTab({ modifiedBlobs, files }: SkinPreviewTabProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [debugBoneId, setDebugBoneId] = useState<string>('upTorso');
    const [currentPose, setCurrentPose] = useState<string>('standing');
    const [debugOffsetX, setDebugOffsetX] = useState(0);
    const [debugOffsetY, setDebugOffsetY] = useState(0);
    const [debugZoom, setDebugZoom] = useState(8);

    const imagesRef = useRef<Record<string, HTMLImageElement>>({});

    // When selecting a new bone, preset the sliders to its current default offset
    useEffect(() => {
        const bone = defaultSkeleton.find(b => b.id === debugBoneId);
        if (bone) {
            setDebugOffsetX(bone.offsetX);
            setDebugOffsetY(bone.offsetY);
        }
    }, [debugBoneId]);

    useEffect(() => {
        const loadImages = async () => {
            const promises = defaultSkeleton.map(bone => {
                return new Promise<void>((resolve) => {
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
    }, [modifiedBlobs, files, debugOffsetX, debugOffsetY, debugZoom, debugBoneId, currentPose]);

    const drawSkeleton = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(debugZoom, debugZoom);
        ctx.imageSmoothingEnabled = false;

        const activeBonesForThisStep = defaultSkeleton.map(b => b.id);

        // Calculate global transforms
        const transforms: Record<string, { x: number, y: number, r: number }> = {};
        
        const getTransform = (boneId: string): { x: number, y: number, r: number } => {
            if (transforms[boneId]) return transforms[boneId];
            
            const bone = defaultSkeleton.find(b => b.id === boneId);
            if (!bone) return { x: 0, y: 0, r: 0 };

            let ox = bone.id === debugBoneId ? debugOffsetX : bone.offsetX;
            let oy = bone.id === debugBoneId ? debugOffsetY : bone.offsetY;
            let r = bone.rotation;

            // Apply pose overrides
            const poseOverride = poses[currentPose]?.bones?.[boneId];
            if (poseOverride) {
                if (poseOverride.offsetX !== undefined) ox += poseOverride.offsetX;
                if (poseOverride.offsetY !== undefined) oy += poseOverride.offsetY;
                if (poseOverride.rotation !== undefined) r += poseOverride.rotation;
            }

            if (!bone.parentId) {
                transforms[boneId] = { x: ox, y: oy, r: r };
            } else {
                const p = getTransform(bone.parentId);
                transforms[boneId] = {
                    x: p.x + ox * Math.cos(p.r) - oy * Math.sin(p.r),
                    y: p.y + ox * Math.sin(p.r) + oy * Math.cos(p.r),
                    r: p.r + r
                };
            }
            return transforms[boneId];
        };

        // Precompute all transforms
        defaultSkeleton.forEach(b => getTransform(b.id));

        // Sort by zIndex to draw back-to-front
        const sortedBones = [...defaultSkeleton]
            .filter(b => activeBonesForThisStep.includes(b.id))
            .sort((a, b) => a.zIndex - b.zIndex);

        sortedBones.forEach(bone => {
            const t = transforms[bone.id];
            const img = imagesRef.current[bone.spriteName];
            
            if (img) {
                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.rotate(t.r);
                
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                
                ctx.restore();
            }
        });

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
                
                <div className="preview-debug-panel" style={{ marginTop: 20, padding: 15, background: 'var(--panel-bg)', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Bone Calibration Tool</h4>
                    
                    <div className="debug-control" style={{ marginBottom: 15 }}>
                        <label style={{ fontWeight: 'bold' }}>Current Pose:</label>
                        <select 
                            value={currentPose} 
                            onChange={e => setCurrentPose(e.target.value)}
                            style={{ marginLeft: 10, padding: 4 }}
                        >
                            {Object.keys(poses).map(poseKey => (
                                <option key={poseKey} value={poseKey}>{poses[poseKey].name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="debug-control" style={{ marginBottom: 15 }}>
                        <label style={{ fontWeight: 'bold' }}>Target Bone:</label>
                        <select 
                            value={debugBoneId} 
                            onChange={e => setDebugBoneId(e.target.value)}
                            style={{ marginLeft: 10, padding: 4 }}
                        >
                            {defaultSkeleton.map(b => (
                                <option key={b.id} value={b.id}>{b.id} ({b.spriteName})</option>
                            ))}
                        </select>
                    </div>

                    <div className="debug-control" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <label style={{ width: 80 }}>X Offset: {debugOffsetX}</label>
                        <input 
                            type="range" 
                            min="-50" max="50" 
                            value={debugOffsetX} 
                            onChange={e => setDebugOffsetX(Number(e.target.value))} 
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div className="debug-control" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <label style={{ width: 80 }}>Y Offset: {debugOffsetY}</label>
                        <input 
                            type="range" 
                            min="-50" max="50" 
                            value={debugOffsetY} 
                            onChange={e => setDebugOffsetY(Number(e.target.value))} 
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div className="debug-control" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ width: 80 }}>Zoom: {debugZoom}x</label>
                        <input 
                            type="range" 
                            min="1" max="20" 
                            value={debugZoom} 
                            onChange={e => setDebugZoom(Number(e.target.value))} 
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
