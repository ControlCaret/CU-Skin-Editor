export interface SpriteFile {
    name: string;
    path: string; // URL for the default fallback sprite
    handle?: any; // FileSystemFileHandle if loaded from local
    category?: string; // Logical folder categorization
    [key: string]: any; // Allow arbitrary metadata
}

export interface SpriteConfig {
    name: string;
    category: string;
    [key: string]: any;
}
