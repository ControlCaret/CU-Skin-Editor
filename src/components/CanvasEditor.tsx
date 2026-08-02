import React from 'react';
import type { SpriteFile } from '../types';

interface CanvasEditorProps {
    containerRef: React.RefObject<HTMLElement>;
    selectedSprite: SpriteFile | null;
    canvasSize: { w: number; h: number };
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    handleAutoZoom: () => void;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleMouseUp: () => void;
    showGuide: boolean;
    showPixelGrid: boolean;
    tool: 'pencil' | 'eraser' | 'eyedropper' | 'fill' | 'select';
    selectionBounds: { x: number; y: number; w: number; h: number } | null;
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
    selectionBounds
}: CanvasEditorProps) {
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
                </>
            )}
        </main>
    );
}
