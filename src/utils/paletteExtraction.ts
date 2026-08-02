export type Color = { r: number; g: number; b: number; a: number };

export function extractPalette(imageData: ImageData, maxColors: number = 14): Color[] {
    const data = imageData.data;
    const colorCounts = new Map<string, { color: Color, count: number }>();

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3] / 255;
        
        if (a === 0) continue; // Skip transparent pixels
        
        const key = `${r},${g},${b},${a}`;
        if (colorCounts.has(key)) {
            colorCounts.get(key)!.count++;
        } else {
            colorCounts.set(key, { color: { r, g, b, a }, count: 1 });
        }
    }

    const sorted = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);
    const palette: Color[] = [];

    // Euclidean distance threshold for clustering
    const colorDistance = (c1: Color, c2: Color) => {
        return Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
    };

    for (const item of sorted) {
        if (palette.length >= maxColors) break;
        
        let isDistinct = true;
        for (const existing of palette) {
            if (colorDistance(item.color, existing) < 30) { // Threshold for "too similar"
                isDistinct = false;
                break;
            }
        }
        
        if (isDistinct) {
            palette.push(item.color);
        }
    }
    
    // Fill remaining spots if needed
    if (palette.length < maxColors) {
        for (const item of sorted) {
            if (palette.length >= maxColors) break;
            const alreadyInPalette = palette.some(c => c.r === item.color.r && c.g === item.color.g && c.b === item.color.b && c.a === item.color.a);
            if (!alreadyInPalette) {
                palette.push(item.color);
            }
        }
    }

    return palette;
}
