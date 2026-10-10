import { useState } from 'react';
import type { ResizeInterpolation } from '../utils/resizeSprite';

interface ResizeSpriteDialogProps {
    currentWidth: number;
    currentHeight: number;
    onCancel: () => void;
    onApply: (width: number, height: number, interpolation: ResizeInterpolation) => void;
}

export function ResizeSpriteDialog({
    currentWidth,
    currentHeight,
    onCancel,
    onApply,
}: ResizeSpriteDialogProps) {
    const [width, setWidth] = useState(currentWidth);
    const [height, setHeight] = useState(currentHeight);
    const [keepRatio, setKeepRatio] = useState(true);
    const [interpolation, setInterpolation] = useState<ResizeInterpolation>('nearest');
    const ratio = currentWidth / currentHeight;

    const handleWidthChange = (value: number) => {
        setWidth(value);
        if (keepRatio && Number.isFinite(value)) setHeight(Math.max(1, Math.round(value / ratio)));
    };

    const handleHeightChange = (value: number) => {
        setHeight(value);
        if (keepRatio && Number.isFinite(value)) setWidth(Math.max(1, Math.round(value * ratio)));
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (width > 0 && height > 0) onApply(width, height, interpolation);
    };

    return (
        <div className="resize-dialog-backdrop" onMouseDown={onCancel}>
            <form
                className="resize-dialog"
                onSubmit={handleSubmit}
                onMouseDown={e => e.stopPropagation()}
                onKeyDown={e => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        onCancel();
                    }
                }}
            >
                <h3>Resize Sprite</h3>
                <label>
                    Width
                    <input type="number" min="1" step="1" value={width} onChange={e => handleWidthChange(Number(e.target.value))} />
                </label>
                <label>
                    Height
                    <input type="number" min="1" step="1" value={height} onChange={e => handleHeightChange(Number(e.target.value))} />
                </label>
                <label className="resize-dialog-checkbox">
                    <input type="checkbox" checked={keepRatio} onChange={e => setKeepRatio(e.target.checked)} />
                    Keep aspect ratio
                </label>
                <label>
                    Interpolation
                    <select value={interpolation} onChange={e => setInterpolation(e.target.value as ResizeInterpolation)}>
                        <option value="nearest">Nearest Neighbor</option>
                        <option value="smooth">Smooth</option>
                    </select>
                </label>
                <div className="resize-dialog-actions">
                    <button type="button" onClick={onCancel}>Cancel</button>
                    <button type="submit">Apply</button>
                </div>
            </form>
        </div>
    );
}
