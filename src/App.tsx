import { useState, useEffect, useRef } from 'react'
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
    const [isLocalLoaded, setIsLocalLoaded] = useState(false);
    const [selectedSprite, setSelectedSprite] = useState<SpriteFile | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [color, setColor] = useState('#ff0000');

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

            // Compare found files against the mandatory default list
            const mergedFiles = defaultSprites.map(path => {
                const parts = path.split('/');
                const name = parts[parts.length - 1];
                
                // Find if this mandatory file exists in the local folder
                const localMatch = pngFiles.find(f => f.name === name);
                
                return {
                    name,
                    path: `/${path}`, // Fallback URL if we need to show the base image
                    handle: localMatch ? localMatch.handle : undefined
                };
            });
            
            setFiles(mergedFiles);
            setIsLocalLoaded(true);
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    };

    // Load selected sprite into canvas
    useEffect(() => {
        if (!selectedSprite || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };

        if (selectedSprite.handle) {
            selectedSprite.handle.getFile().then((file: File) => {
                img.src = URL.createObjectURL(file);
            });
        } else {
            img.src = selectedSprite.path;
        }
    }, [selectedSprite]);

    // Drawing logic
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (tool === 'eraser') {
            ctx.clearRect(x, y, 1, 1);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
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
                                {files.map((f, i) => {
                                    const isMissing = isLocalLoaded && !f.handle;
                                    return (
                                        <li key={i} 
                                            onClick={() => setSelectedSprite(f)}
                                            style={{ 
                                                padding: '4px 0', 
                                                cursor: 'pointer', 
                                                borderBottom: '1px solid #333',
                                                backgroundColor: selectedSprite?.name === f.name ? '#333' : 'transparent',
                                                color: isMissing ? '#ff6b6b' : (f.handle ? '#4CAF50' : '#aaa')
                                            }}
                                        >
                                            {f.name} {isMissing ? '(Missing)' : (f.handle ? '(Local)' : '')}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </aside>

                {/* Center Area for Drawing Canvas */}
                <main className="center-canvas">
                    {!selectedSprite ? (
                        <div style={{ color: '#555' }}>Select a sprite to edit</div>
                    ) : (
                        <canvas
                            ref={canvasRef}
                            className="pixel-canvas"
                            onMouseDown={(e) => { setIsDrawing(true); draw(e); }}
                            onMouseMove={draw}
                            onMouseUp={() => setIsDrawing(false)}
                            onMouseLeave={() => setIsDrawing(false)}
                        />
                    )}
                </main>

                {/* Right Panel for Drawing Tools & Properties */}
                <aside className="right-panel">
                    <h3>Tools</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label>
                            <input 
                                type="radio" 
                                checked={tool === 'pencil'} 
                                onChange={() => setTool('pencil')} 
                            /> Pencil
                        </label>
                        <label>
                            <input 
                                type="radio" 
                                checked={tool === 'eraser'} 
                                onChange={() => setTool('eraser')} 
                            /> Eraser
                        </label>
                        <label style={{ marginTop: '10px' }}>
                            Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                        </label>
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default App
