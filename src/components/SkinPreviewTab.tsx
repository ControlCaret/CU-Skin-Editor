import type { SpriteFile } from '../types';

interface SkinPreviewTabProps {
  modifiedBlobs: Record<string, Blob>;
  files: SpriteFile[];
}

export function SkinPreviewTab({ modifiedBlobs, files }: SkinPreviewTabProps) {
  console.log('Loaded files:', files.length, 'Blobs:', Object.keys(modifiedBlobs).length);
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
    </div>
  );
}
