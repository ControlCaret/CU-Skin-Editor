import { useEffect, useRef, useState } from 'react';
import type { SpriteFile } from '../types';
import { sortedBones, boneToSpriteMap } from '../utils/skeleton';
import { animations } from '../utils/animations';
import type { FloatKeyframe, VectorKeyframe, AnimationData } from '../utils/animations';

interface SkinPreviewTabProps {
    modifiedBlobs: Record<string, Blob>;
    files: SpriteFile[];
}

function interpolateFloat(keyframes: FloatKeyframe[], time: number): number | null {
    if (!keyframes || keyframes.length === 0) return null;
    if (keyframes.length === 1) return keyframes[0].val;
    
    let k0 = keyframes[0];
    let k1 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
            k0 = keyframes[i];
            k1 = keyframes[i + 1];
            break;
        }
    }
    
    if (k0.time === k1.time) return k0.val;
    const tNorm = (time - k0.time) / (k1.time - k0.time);
    return k0.val + (k1.val - k0.val) * tNorm;
}

function interpolateVector(keyframes: VectorKeyframe[], time: number): {x: number, y: number} | null {
    if (!keyframes || keyframes.length === 0) return null;
    if (keyframes.length === 1) return {x: keyframes[0].x, y: keyframes[0].y};
    
    let k0 = keyframes[0];
    let k1 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
            k0 = keyframes[i];
            k1 = keyframes[i + 1];
            break;
        }
    }
    
    if (k0.time === k1.time) return {x: k0.x, y: k0.y};
    const tNorm = (time - k0.time) / (k1.time - k0.time);
    return {
        x: k0.x + (k1.x - k0.x) * tNorm,
        y: k0.y + (k1.y - k0.y) * tNorm
    };
}

function getAnimDuration(animData: AnimationData) {
    let maxTime = 0;
    for (const bone of Object.values(animData)) {
        bone.rotation?.forEach(k => maxTime = Math.max(maxTime, k.time));
        bone.position?.forEach(k => maxTime = Math.max(maxTime, k.time));
    }
    return maxTime === 0 ? 1 : maxTime;
}

export function SkinPreviewTab({ modifiedBlobs, files }: SkinPreviewTabProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
    const [zoom, setZoom] = useState(3);
    const [activeAnim, setActiveAnim] = useState<string>('idle');
    
    const animTimeRef = useRef<number>(0);
    const reqRef = useRef<number>(0);
    const autoZoomDoneRef = useRef<boolean>(false);
    
    useEffect(() => {
        let active = true;
        const loadedImages: Record<string, HTMLImageElement> = {};
        let loadedCount = 0;
        const neededSpriteNames = Array.from(new Set(Object.values(boneToSpriteMap)));
        
        neededSpriteNames.forEach(spriteName => {
            const blob = modifiedBlobs[spriteName];
            let url = '';
            if (blob) {
                url = URL.createObjectURL(blob);
            } else {
                const file = files.find(f => f.name === spriteName);
                if (file) url = file.path;
            }
            
            const checkDone = () => {
                if (loadedCount === neededSpriteNames.length) {
                    setImages({ ...loadedImages });
                    autoZoomDoneRef.current = false; // Trigger auto-zoom for new images
                }
            };
            
            if (!url) {
                loadedCount++;
                checkDone();
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                if (!active) return;
                loadedImages[spriteName] = img;
                loadedCount++;
                checkDone();
            };
            img.onerror = () => {
                if (!active) return;
                loadedCount++;
                checkDone();
            };
            img.src = url;
        });
        
        return () => { active = false; };
    }, [modifiedBlobs, files]);
    
    useEffect(() => {
        let lastTime = performance.now();
        const render = (timeMs: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            const animData = animations[activeAnim];
            const duration = animData ? getAnimDuration(animData) : 1;
            
            reqRef.current = requestAnimationFrame(render);
            const dt = (timeMs - lastTime) / 1000;
            lastTime = timeMs;
            
            animTimeRef.current = (animTimeRef.current + dt) % duration;
            const t = animTimeRef.current;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (Object.keys(images).length === 0) {
                ctx.fillStyle = '#9ca3af';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Loading sprites...', canvas.width / 2, canvas.height / 2);
                return;
            }
            
            if (!images[boneToSpriteMap[sortedBones[0]?.id]] || !images[boneToSpriteMap['downTorso']]) {
                return;
            }
            
            const computedPoses: Record<string, {x: number, y: number, rotZ: number}> = {};
            
            const getAnchorPixels = (b: typeof sortedBones[0], ax: number, ay: number, img: HTMLImageElement) => {
                let cw = 1; let ch = 1;
                if (b.collider) {
                    if (b.collider.type === 'BoxCollider2D' && b.collider.size) {
                        cw = b.collider.size.x || 1;
                        ch = b.collider.size.y || 1;
                    } else if (b.collider.type === 'CircleCollider2D' && b.collider.radius) {
                        cw = b.collider.radius * 2;
                        ch = b.collider.radius * 2;
                    }
                }
                return { x: (ax / cw) * img.width, y: (ay / ch) * img.height };
            };
            
            const computeBone = (boneId: string): {x: number, y: number, rotZ: number} => {
                if (computedPoses[boneId]) return computedPoses[boneId];
                
                const bone = sortedBones.find(b => b.id === boneId);
                if (!bone) return { x: 0, y: 0, rotZ: 0 };
                
                let rotZ = bone.baseRotation;
                let hasAnimRot = false;
                if (animData && animData[boneId]) {
                    const bAnim = animData[boneId];
                    const animRot = interpolateFloat(bAnim.rotation, t);
                    if (animRot !== null) {
                        rotZ = animRot;
                        hasAnimRot = true;
                    }
                }
                
                if (!bone.joint || !bone.joint.connectedBody) {
                    let posX = 0; let posY = 0;
                    if (animData && animData[boneId]) {
                        const animPos = interpolateVector(animData[boneId].position, t);
                        if (animPos) {
                            let implicitPPU = 50;
                            const rImg = images[boneToSpriteMap[boneId]];
                            if (rImg && bone.collider && bone.collider.type === 'BoxCollider2D' && bone.collider.size) {
                                implicitPPU = rImg.height / bone.collider.size.y;
                            }
                            posX = (animPos.x - bone.basePosition.x) * implicitPPU;
                            posY = (animPos.y - bone.basePosition.y) * implicitPPU;
                        }
                    }
                    computedPoses[boneId] = { x: posX, y: posY, rotZ };
                    return computedPoses[boneId];
                }
                
                const parentPose = computeBone(bone.joint.connectedBody);
                const parentBone = sortedBones.find(b => b.id === bone.joint!.connectedBody);
                
                // Only rigidly inherit rotation for manually attached visual child sprites (eyes, nosebleed, tail).
                // Physics hinge limbs should keep their absolute base rotation (simulating hanging from gravity).
                if (!hasAnimRot && parentBone && parentPose && (boneId === 'eyes' || boneId === 'nosebleed' || boneId === 'noseblood' || boneId === 'tail')) {
                    rotZ = bone.baseRotation + (parentPose.rotZ - parentBone.baseRotation);
                    
                    // Add procedural tail wagging since it lacks baked animation keyframes
                    if (boneId === 'tail') {
                        if (activeAnim === 'walk') {
                            // Wag twice per walk cycle (matching footsteps), amplitude 15 degrees
                            rotZ += Math.sin(t * Math.PI * 4) * 12;
                        } else if (activeAnim === 'idle') {
                            // Gentle wag for breathing, amplitude 4 degrees
                            rotZ += Math.sin(t * Math.PI * 2) * 2;
                        }
                        //console.log('tail wagging', {t, rotZ, activeAnim});
                    }
                }
                
                const img = images[boneToSpriteMap[boneId]];
                const parentImg = images[boneToSpriteMap[bone.joint.connectedBody]];
                
                if (!img || !parentImg || !parentBone) {
                    return { x: parentPose.x, y: parentPose.y, rotZ };
                }
                
                const rotateVec = (v: {x: number, y: number}, deg: number) => {
                    const rad = deg * (Math.PI / 180);
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    return {
                        x: v.x * cos - v.y * sin,
                        y: v.x * sin + v.y * cos
                    };
                };
                
                const pAnchor = getAnchorPixels(parentBone, bone.joint.connectedAnchor.x, bone.joint.connectedAnchor.y, parentImg);
                const cAnchor = getAnchorPixels(bone, bone.joint.anchor.x, bone.joint.anchor.y, img);
                
                const pAnchorRot = rotateVec(pAnchor, parentPose.rotZ);
                const parentAnchorX = parentPose.x + pAnchorRot.x;
                const parentAnchorY = parentPose.y + pAnchorRot.y;
                
                const cAnchorRot = rotateVec(cAnchor, rotZ);
                const childPosX = parentAnchorX - cAnchorRot.x;
                const childPosY = parentAnchorY - cAnchorRot.y;
                
                computedPoses[boneId] = { x: childPosX, y: childPosY, rotZ };
                return computedPoses[boneId];
            };
            
            // Ensure all poses are computed
            sortedBones.forEach(b => computeBone(b.id));
            
            // Calculate bounding box to dynamically center the character
            let minY = Infinity;
            let maxY = -Infinity;
            let minX = Infinity;
            let maxX = -Infinity;
            
            Object.values(computedPoses).forEach(pose => {
                if (pose.y < minY) minY = pose.y;
                if (pose.y > maxY) maxY = pose.y;
                if (pose.x < minX) minX = pose.x;
                if (pose.x > maxX) maxX = pose.x;
            });
            
            const centerY = (minY + maxY) / 2 || 0;
            const centerX = (minX + maxX) / 2 || 0;
            
            const charHeight = maxY - minY;
            const charWidth = maxX - minX;

            if (!autoZoomDoneRef.current && charHeight > 0 && charWidth > 0 && charHeight < Infinity) {
                autoZoomDoneRef.current = true;
                const zoomY = (canvas.height * 0.75) / charHeight;
                const zoomX = (canvas.width * 0.75) / charWidth;
                const targetZoom = Math.min(10, Math.max(0.5, Math.min(zoomX, zoomY)));
                const roundedZoom = Math.max(0.5, Math.round(targetZoom * 2) / 2);
                setTimeout(() => setZoom(roundedZoom), 0);
            }

            ctx.save();
            // Move origin to canvas center
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(zoom, zoom);
            ctx.imageSmoothingEnabled = false;
            
            // Offset drawing by the computed center of the skeleton
            ctx.translate(-centerX, centerY);
            
            sortedBones.forEach(bone => {
                const spriteName = boneToSpriteMap[bone.id];
                const img = images[spriteName];
                if (!img) return;
                
                const pose = computedPoses[bone.id];
                
                ctx.save();
                ctx.translate(pose.x, -pose.y);
                ctx.rotate(-pose.rotZ * (Math.PI / 180));
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                ctx.restore();
            });
            
            ctx.restore();
        };
        
        reqRef.current = requestAnimationFrame(render);
        return () => {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, [images, zoom, activeAnim]);
    
    return (
        <main className="center-canvas">
            <canvas 
                ref={canvasRef}
                width={800}
                height={800}
                className="pixel-canvas"
                style={{ 
                    maxWidth: '95%', 
                    maxHeight: '95%', 
                    objectFit: 'contain',
                    borderRadius: '8px'
                }}
            />
            
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
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={e => { if (activeAnim !== anim) e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                        onMouseOut={e => { if (activeAnim !== anim) e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
                    >
                        {anim.toUpperCase()}
                    </button>
                ))}
            </div>
            
            <div className="zoom-controls">
                <button onClick={() => { autoZoomDoneRef.current = false; }} className="zoom-btn-auto">Auto</button>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="zoom-btn">-</button>
                <input 
                    type="range" 
                    min="0.5" max="10" step="0.5"
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
