import { SketchPicker } from 'react-color';

interface RightPanelProps {
    rightPanelWidth: number;
    tool: 'pencil' | 'eraser' | 'eyedropper' | 'fill' | 'select';
    setTool: (tool: 'pencil' | 'eraser' | 'eyedropper' | 'fill' | 'select') => void;
    brushSize: number;
    setBrushSize: (size: number) => void;
    color: { r: number, g: number, b: number, a: number };
    setColor: (c: { r: number, g: number, b: number, a: number }) => void;
    recentColors: { r: number, g: number, b: number, a: number }[];
    extractedColors: { r: number, g: number, b: number, a: number }[];
    rgbaToHex: (c: { r: number, g: number, b: number, a: number }) => string;
    onStartResize: () => void;
}

export function RightPanel({
    rightPanelWidth,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    color,
    setColor,
    recentColors,
    extractedColors,
    rgbaToHex,
    onStartResize
}: RightPanelProps) {
    return (
        <aside className="right-panel" style={{ width: rightPanelWidth, flexShrink: 0, position: 'relative' }}>
            <div 
                className="resizer" 
                onMouseDown={(e) => { e.preventDefault(); onStartResize(); }}
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0 }}
            />
            <h3>Tools</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                
                <div className="tools-grid">
                    <button 
                        onClick={() => setTool('pencil')}
                        className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                        <span><u>P</u>en</span>
                    </button>
                    <button 
                        onClick={() => setTool('eraser')}
                        className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"></path><line x1="16" y1="15" x2="9" y2="8"></line></svg>
                        <span><u>E</u>raser</span>
                    </button>
                    <button 
                        onClick={() => setTool('fill')}
                        className={`tool-btn ${tool === 'fill' ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.2 8.5l-4-4L4 15.7V20h4.3l10.9-11.5z"></path><path d="M2 22h20"></path><path d="M16.5 6l2 2"></path></svg>
                        <span><u>F</u>ill</span>
                    </button>
                    <button 
                        onClick={() => setTool('eyedropper')}
                        className={`tool-btn ${tool === 'eyedropper' ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 9.5L17 7l-2-2-2.5 2.5"></path><path d="M12 12l-7 7v3h3l7-7"></path><path d="M3 21l3-3"></path></svg>
                        <span>P<u>i</u>ck</span>
                    </button>
                    <button 
                        onClick={() => setTool('select')}
                        className={`tool-btn ${tool === 'select' ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                        <span><u>S</u>elect</span>
                    </button>
                </div>
                
                <div className="brush-size-container">
                    <label className="brush-size-label">
                        <div className="brush-size-header">
                            <span>Brush Size</span>
                            <span>{brushSize}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" max="16" 
                            value={brushSize} 
                            onChange={e => setBrushSize(Number(e.target.value))} 
                            className="brush-slider"
                        />
                    </label>
                </div>

                <div className="custom-color-picker color-picker-wrapper">
                    <SketchPicker 
                        color={color} 
                        onChange={(c) => setColor({ r: c.rgb.r, g: c.rgb.g, b: c.rgb.b, a: c.rgb.a ?? 1 })}
                        presetColors={[]}
                        disableAlpha={false}
                    />
                    
                    <div className="custom-palettes-container">
                        <div>
                            <span className="palette-title">Extracted Colors</span>
                            <div className="palette-grid">
                                {extractedColors.map((c, i) => {
                                    const hex = rgbaToHex(c);
                                    return (
                                        <div 
                                            key={`ext-${i}`} 
                                            onClick={() => setColor(c)}
                                            className="palette-swatch"
                                            style={{ backgroundColor: hex }}
                                            title={hex}
                                        />
                                    );
                                })}
                                {extractedColors.length === 0 && <span className="palette-empty-text">No colors extracted yet.</span>}
                            </div>
                        </div>
                        
                        <div className="palette-section-divider">
                            <span className="palette-title">Recent Colors</span>
                            <div className="palette-grid">
                                {recentColors.map((c, i) => {
                                    const hex = rgbaToHex(c);
                                    return (
                                        <div 
                                            key={`rec-${i}`} 
                                            onClick={() => setColor(c)}
                                            className="palette-swatch"
                                            style={{ backgroundColor: hex }}
                                            title={hex}
                                        />
                                    );
                                })}
                                {recentColors.length === 0 && <span className="palette-empty-text">No recent colors yet.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
