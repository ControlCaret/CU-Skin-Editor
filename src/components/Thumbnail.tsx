import { useState, useEffect } from 'react';
import { SpriteFile } from '../types';

export function Thumbnail({ file, modifiedBlob }: { file: SpriteFile, modifiedBlob?: Blob }) {
    const [src, setSrc] = useState<string>('');

    useEffect(() => {
        let url = '';
        let active = true;

        if (modifiedBlob) {
            url = URL.createObjectURL(modifiedBlob);
            if (active) setSrc(url);
        } else if (file.handle) {
            file.handle.getFile().then((f: File) => {
                url = URL.createObjectURL(f);
                if (active) setSrc(url);
            });
        } else {
            setSrc(file.path);
        }

        return () => {
            active = false;
            if (url && (modifiedBlob || file.handle)) {
                URL.revokeObjectURL(url);
            }
        };
    }, [file, modifiedBlob]);

    if (!src) return <div style={{ width: '32px', height: '32px', flexShrink: 0, marginRight: '8px', backgroundColor: '#444' }} />;
    return <img src={src} alt={file.name} style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0, marginRight: '8px', imageRendering: 'pixelated' }} />;
}
