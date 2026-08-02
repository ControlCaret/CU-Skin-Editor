import type { SpriteFile } from '../types';
import { Thumbnail } from './Thumbnail';

interface LeftPanelProps {
    leftPanelWidth: number;
    files: SpriteFile[];
    isLocalLoaded: boolean;
    selectedSprite: SpriteFile | null;
    modifiedBlobs: Record<string, Blob>;
    handleSpriteSelect: (file: SpriteFile) => void;
}

export function LeftPanel({
    leftPanelWidth,
    files,
    isLocalLoaded,
    selectedSprite,
    modifiedBlobs,
    handleSpriteSelect
}: LeftPanelProps) {
    return (
        <aside className="left-panel" style={{ width: leftPanelWidth, flexShrink: 0 }}>
            <h3>Sprites</h3>
            <div className="sprite-list-container">
                {files.length === 0 ? (
                    <span>No sprites loaded.</span>
                ) : (
                    <ul className="sprite-list">
                        {files.map((f, i) => {
                            const isMissing = isLocalLoaded && !f.handle;
                            const isActive = selectedSprite?.name === f.name;
                            let itemClass = "sprite-list-item";
                            if (isActive) itemClass += " active";
                            if (isMissing) itemClass += " missing";
                            else if (f.handle) itemClass += " local";
                            if (f.unused) itemClass += " unused";
                            
                            return (
                                <li key={i} 
                                    onClick={() => handleSpriteSelect(f)}
                                    className={itemClass}
                                >
                                    <Thumbnail file={f} modifiedBlob={modifiedBlobs[f.name]} />
                                    <span className="sprite-text">
                                        <span className="sprite-name">{f.name}</span>
                                        {modifiedBlobs[f.name] ? ' *' : ''} 
                                        {isMissing ? ' (Missing)' : (f.handle ? ' (Local)' : '')}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </aside>
    );
}
