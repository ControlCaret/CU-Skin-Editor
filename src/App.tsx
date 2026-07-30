import { useState, useEffect } from 'react'
import './App.css'
import { defaultSprites } from './defaultSprites'

// Define our file item interface
interface SpriteFile {
    name: string;
    path: string;
    handle?: any; // FileSystemFileHandle, undefined if it's a preloaded static file
}

function App() {
    const [files, setFiles] = useState<SpriteFile[]>([]);

    // Preload default sprites on mount
    useEffect(() => {
        const preloadedFiles = defaultSprites.map(path => {
            // Extract filename from path (e.g., ".ogsprites/Body/experimentCrus.png" -> "experimentCrus.png")
            const parts = path.split('/');
            const name = parts[parts.length - 1];
            return {
                name,
                path: `/${path}`, // Absolute path from public root for fetch/image src
                handle: undefined
            };
        });
        setFiles(preloadedFiles);
    }, []);

    const handleOpenFolder = async () => {
        try {
            // @ts-ignore: File System Access API types
            const dirHandle = await window.showDirectoryPicker();
            const pngFiles: SpriteFile[] = [];

            // Check if there is a "Body" folder inside the selected directory
            let targetDirHandle = dirHandle;
            let basePath = '';
            
            try {
                // Try to get the "Body" subdirectory
                targetDirHandle = await dirHandle.getDirectoryHandle('Body');
                basePath = 'Body/';
            } catch (e) {
                // If "Body" doesn't exist, we assume they either selected the Body folder directly,
                // or we just read the selected folder as a fallback.
                console.log("No 'Body' folder found at root, reading selected folder directly.");
            }

            // Read only 1 level deep from the target folder
            for await (const entry of targetDirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.png')) {
                    pngFiles.push({ 
                        name: entry.name,
                        path: basePath + entry.name,
                        handle: entry 
                    });
                }
            }
            
            setFiles(pngFiles);
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    };

    return (
        <div className="app-container">
            {/* Top Bar for Menus */}
            <header className="top-bar">
                <span className="menu-item" onClick={handleOpenFolder} style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    [Open Local Folder]
                </span>
                <span className="menu-item">File</span>
                <span className="menu-item">Edit</span>
                <span className="menu-item">View</span>
                <span className="menu-item">Tools</span>
            </header>

            <div className="main-content">
                {/* Left Panel for Sprite List */}
                <aside className="left-panel">
                    <h3>Sprites</h3>
                    <div style={{ color: '#ccc', fontSize: '12px', overflowY: 'auto' }}>
                        {files.length === 0 ? (
                            <span>No sprites loaded.</span>
                        ) : (
                            <ul style={{ listStyleType: 'none', padding: 0 }}>
                                {files.map((f, i) => (
                                    <li key={i} style={{ 
                                        padding: '4px 0', 
                                        cursor: 'pointer', 
                                        borderBottom: '1px solid #333',
                                        color: f.handle ? '#fff' : '#aaa' // Dim preloaded files slightly
                                    }}>
                                        {f.name} {f.handle ? '(Local)' : '(Preloaded)'}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>

                {/* Center Area for Drawing Canvas */}
                <main className="center-canvas">
                    <div style={{ color: '#555' }}>
                        Canvas Area
                    </div>
                </main>

                {/* Right Panel for Drawing Tools & Properties */}
                <aside className="right-panel">
                    <h3>Tools</h3>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                        Pencil<br/>
                        Eraser<br/>
                        Color Picker
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default App
