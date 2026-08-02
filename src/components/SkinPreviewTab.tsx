import { useState, useEffect, useRef } from 'react';
import type { SpriteFile } from '../types';
import { defaultSkeleton, poses, calculateAnimatedSkeleton } from '../utils/skeleton';
import type { AnimationType } from '../utils/skeleton';

interface SkinPreviewTabProps {
    modifiedBlobs: Record<string, Blob>;
    files: SpriteFile[];
}

export function SkinPreviewTab({ modifiedBlobs, files }: SkinPreviewTabProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [debugBoneId, setDebugBoneId] = useState<string>('upTorso');
    const [currentPose, setCurrentPose] = useState<string>('standing');
    const [animation, setAnimation] = useState<AnimationType>('idle');
    const [time, setTime] = useState<number>(0);
    const timeRef = useRef<number>(0);
    const requestRef = useRef<number | undefined>(undefined);
    const [debugOffsetX, setDebugOffsetX] = useState(0);
    const [debugOffsetY, setDebugOffsetY] = useState(0);
    const [debugPivotX, setDebugPivotX] = useState(0);
    const [debugPivotY, setDebugPivotY] = useState(0);
    const [debugZoom, setDebugZoom] = useState(8);

    const imagesRef = useRef<Record<string, HTMLImageElement>>({});

    // When selecting a new bone, preset the sliders to its current default offset
    useEffect(() => {
        const bone = defaultSkeleton.find(b => b.id === debugBoneId);
        if (bone) {
            setDebugOffsetX(bone.offsetX);
            setDebugOffsetY(bone.offsetY);
            setDebugPivotX(bone.pivotX || 0);
            setDebugPivotY(bone.pivotY || 0);
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
            // Initial draw will be handled by the draw effect
        };

        loadImages();
    }, [modifiedBlobs, files]);

    useEffect(() => {
        drawSkeleton();
    }, [time, debugOffsetX, debugOffsetY, debugPivotX, debugPivotY, debugZoom, debugBoneId, currentPose, animation, modifiedBlobs]);

    // Animation loop
    useEffect(() => {
        let lastTimestamp: number | null = null;
        
        const animate = (timestamp: number) => {
            if (lastTimestamp === null) lastTimestamp = timestamp;
            const deltaTime = (timestamp - lastTimestamp) / 1000; // seconds
            lastTimestamp = timestamp;
            
            if (animation !== 'none') {
                timeRef.current += deltaTime;
                setTime(timeRef.current);
            }
            
            requestRef.current = requestAnimationFrame(animate);
        };
        
        requestRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animation]);

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
        
        const currentPoseData = poses[currentPose] || { name: 'None', bones: {} };
        
        // Apply debug offsets to the base skeleton BEFORE animation
        const baseSkeleton = defaultSkeleton.map(b => {
            if (b.id === debugBoneId) {
                return { ...b, offsetX: debugOffsetX, offsetY: debugOffsetY, pivotX: debugPivotX, pivotY: debugPivotY };
            }
            return b;
        });

        const animatedSkeleton = calculateAnimatedSkeleton(baseSkeleton, currentPoseData, animation, time);

        // Calculate global transforms
        const transforms: Record<string, { x: number, y: number, r: number }> = {};
        
        const getTransform = (boneId: string): { x: number, y: number, r: number } => {
            if (transforms[boneId]) return transforms[boneId];
            
            const bone = animatedSkeleton.find(b => b.id === boneId);
            if (!bone) return { x: 0, y: 0, r: 0 };

            let ox = bone.offsetX;
            let oy = bone.offsetY;
            let r = bone.rotation;

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
        animatedSkeleton.forEach(b => getTransform(b.id));

        // Sort by zIndex to draw back-to-front
        const sortedBones = [...animatedSkeleton]
            .filter(b => activeBonesForThisStep.includes(b.id))
            .sort((a, b) => a.zIndex - b.zIndex);

        sortedBones.forEach(bone => {
            const t = transforms[bone.id];
            const img = imagesRef.current[bone.spriteName];
            
            if (img) {
                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.rotate(t.r);
                
                const px = bone.pivotX || 0;
                const py = bone.pivotY || 0;
                ctx.drawImage(img, -img.width / 2 - px, -img.height / 2 - py);
                
                // Draw pivot point for debugging
                if (bone.id === debugBoneId) {
                    ctx.fillStyle = 'red';
                    ctx.beginPath();
                    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                
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
                        <label style={{ fontWeight: 'bold' }}>Animation:</label>
                        <select 
                            value={animation} 
                            onChange={e => {
                                setAnimation(e.target.value as AnimationType);
                                if (e.target.value === 'none') {
                                    timeRef.current = 0;
                                    setTime(0);
                                }
                            }}
                            style={{ marginLeft: 10, padding: 4 }}
                        >
                            <option value="none">None</option>
                            <option value="idle">Idle (Breathing)</option>
                            <option value="walk">Walk (Sine wave)</option>
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
                    <hr style={{ margin: '15px 0', borderColor: '#444' }} />
                    <div className="debug-control" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <label style={{ width: 80 }}>Pivot X: {debugPivotX}</label>
                        <input 
                            type="range" 
                            min="-50" max="50" 
                            value={debugPivotX} 
                            onChange={e => setDebugPivotX(Number(e.target.value))} 
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div className="debug-control" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <label style={{ width: 80 }}>Pivot Y: {debugPivotY}</label>
                        <input 
                            type="range" 
                            min="-50" max="50" 
                            value={debugPivotY} 
                            onChange={e => setDebugPivotY(Number(e.target.value))} 
                            style={{ flex: 1 }}
                        />
                    </div>
                    <hr style={{ margin: '15px 0', borderColor: '#444' }} />
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
