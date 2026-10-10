export type ResizeInterpolation = 'nearest' | 'smooth';

export function resizeSpriteCanvas(
    source: HTMLCanvasElement,
    width: number,
    height: number,
    interpolation: ResizeInterpolation = 'nearest',
): HTMLCanvasElement {
    if (!Number.isInteger(width) || width < 1) {
        throw new Error('Sprite width must be a positive integer.');
    }

    if (!Number.isInteger(height) || height < 1) {
        throw new Error('Sprite height must be a positive integer.');
    }

    const resized = document.createElement('canvas');
    resized.width = width;
    resized.height = height;

    const context = resized.getContext('2d');
    if (!context) {
        throw new Error('Unable to create a 2D canvas context.');
    }

    context.imageSmoothingEnabled = interpolation === 'smooth';
    context.drawImage(source, 0, 0, width, height);

    return resized;
}
