import React, { useState, useRef, useCallback } from 'react';
import type { SpriteFile } from '../types';
import { SkinPreviewCanvas } from './SkinPreviewCanvas';

interface CanvasEditorProps {
    containerRef: React.RefObject<HTMLElement | null>;
    selectedSprite: SpriteFile | null;
    canvasSize: { w: number; h: number };
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    handleAutoZoom: () => void;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleMouseUp: () => void;
    showGuide: boolean;
    showPixelGrid: boolean;
    tool: 'pencil' | 'eraser' | 'eyedropper' | 'fill' | 'select';
    selectionBounds: { x: number; y: number; w: number; h: number } | null;
    modifiedBlobs: Record<string, Blob>;
    files: SpriteFile[];
    activeAnim: string;
    selectedEye: string;
    showNosebleed: boolean;
}

export function CanvasEditor({
    containerRef,
    selectedSprite,
    canvasSize,
    zoom,
    setZoom,
    handleAutoZoom,
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    showGuide,
    showPixelGrid,
    tool,
    selectionBounds,
    modifiedBlobs,
    files,
    activeAnim,
    selectedEye,
    showNosebleed,
}: CanvasEditorProps) {
    const [previewSize, setPreviewSize] = useState(180);
    const dragStartRef = useRef<{ x: number; y: number; size: number } | null>(null);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragStartRef.current = { x: e.clientX, y: e.clientY, size: previewSize };
        const onMouseMove = (mv: MouseEvent) => {
            if (!dragStartRef.current) return;
            const delta = Math.max(dragStartRef.current.x - mv.clientX, mv.clientY - dragStartRef.current.y);
            setPreviewSize(Math.min(400, Math.max(100, dragStartRef.current.size + delta)));
        };
        const onMouseUp = () => {
            dragStartRef.current = null;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [previewSize]);

    return (
        <main className="center-canvas" ref={containerRef}>
            {!selectedSprite ? (
                <div style={{ color: '#555' }}>Select a sprite to edit</div>
            ) : (
                <>
                    <div className="canvas-info">
                        {canvasSize.w} &times; {canvasSize.h} px
                    </div>
                    <div className="zoom-controls">
                        <button onClick={handleAutoZoom} className="zoom-btn-auto">Auto</button>
                        <button onClick={() => setZoom(z => Math.max(1, z - 1))} className="zoom-btn">-</button>
                        <input
                            type="range"
                            min="1" max="100"
                            value={zoom}
                            onChange={e => setZoom(Number(e.target.value))}
                            className="zoom-slider"
                        />
                        <span className="zoom-text">{zoom}x</span>
                        <button onClick={() => setZoom(z => Math.min(100, z + 1))} className="zoom-btn">+</button>
                    </div>
                    <div className="canvas-wrapper">
                        <div className="checkerboard" style={{ position: 'relative', width: `${canvasSize.w * zoom}px`, height: `${canvasSize.h * zoom}px` }}>
                            <canvas
                                ref={canvasRef}
                                className="pixel-canvas"
                                style={{ width: '100%', height: '100%' }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            />
                            {showGuide && (
                                <>
                                    <div className="guide-line-v" />
                                    <div className="guide-line-h" />
                                </>
                            )}
                            {showPixelGrid && zoom > 2 && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    pointerEvents: 'none',
                                    backgroundImage: `
                                        linear-gradient(to right, rgba(128,128,128,0.3) 1px, transparent 1px),
                                        linear-gradient(to bottom, rgba(128,128,128,0.3) 1px, transparent 1px)
                                    `,
                                    backgroundSize: `${zoom}px ${zoom}px`
                                }} />
                            )}
                            {tool === 'select' && selectionBounds && (
                                <div
                                    className="selection-box"
                                    style={{
                                        left: selectionBounds.x * zoom,
                                        top: selectionBounds.y * zoom,
                                        width: selectionBounds.w * zoom,
                                        height: selectionBounds.h * zoom
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    <div style={{
                        position: 'absolute',
                        top: 12, right: 12,
                        zIndex: 20,
                        width: previewSize, height: previewSize,
                        userSelect: 'none',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 6,
                        overflow: 'hidden',
                    }}>
                        <SkinPreviewCanvas
                            modifiedBlobs={modifiedBlobs}
                            files={files}
                            activeAnim={activeAnim}
                            width={previewSize}
                            height={previewSize}
                            style={{ display: 'block', width: '100%', height: '100%' }}
                            spriteOverrides={{ head: 'experimentHeadBack.png', eyes: selectedEye }}
                            showNosebleed={showNosebleed}
                        />
                        <div
                            onMouseDown={handleResizeMouseDown}
                            style={{
                                position: 'absolute',
                                bottom: 0, left: 0,
                                width: 14, height: 14,
                                cursor: 'nwse-resize',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.5,
                            }}
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <line x1="0" y1="10" x2="10" y2="0" stroke="white" strokeWidth="1.5"/>
                                <line x1="4" y1="10" x2="10" y2="4" stroke="white" strokeWidth="1.5"/>
                            </svg>
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}
