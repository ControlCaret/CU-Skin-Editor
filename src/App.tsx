import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import './App.css'
import { defaultSprites } from './defaultSprites'

interface SpriteFile {
    name: string;
    path: string;
    handle?: any; // FileSystemFileHandle, undefined if it's a preloaded static file
}

function Thumbnail({ file, modifiedBlob }: { file: SpriteFile, modifiedBlob?: Blob }) {
    const [src, setSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        let url: string | undefined;
        let active = true;

        if (modifiedBlob) {
            url = URL.createObjectURL(modifiedBlob);
            setSrc(url);
        } else if (file.handle) {
            file.handle.getFile().then((f: File) => {
                if (active) {
                    url = URL.createObjectURL(f);
                    setSrc(url);
                }
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

    if (!src) return <div style={{ width: '24px', height: '24px', marginRight: '8px', display: 'inline-block', backgroundColor: '#444' }} />;
    return <img src={src} alt={file.name} style={{ width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle', imageRendering: 'pixelated' }} />;
}

function App() {
    const [files, setFiles] = useState<SpriteFile[]>([]);
    const [isLocalLoaded, setIsLocalLoaded] = useState(false);
    const [selectedSprite, setSelectedSprite] = useState<SpriteFile | null>(null);
    const [modifiedBlobs, setModifiedBlobs] = useState<Record<string, Blob>>({});
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [color, setColor] = useState('#ff0000');
    
    // Resizing logic for the panels
    const [leftPanelWidth, setLeftPanelWidth] = useState(250);
    const [rightPanelWidth, setRightPanelWidth] = useState(200);
    const resizingPanel = useRef<'left' | 'right' | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingPanel.current === 'left') {
                const newWidth = Math.max(150, Math.min(600, e.clientX));
                setLeftPanelWidth(newWidth);
            } else if (resizingPanel.current === 'right') {
                const newWidth = Math.max(150, Math.min(600, window.innerWidth - e.clientX));
                setRightPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (resizingPanel.current) {
                resizingPanel.current = null;
                document.body.style.cursor = 'default';
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    useEffect(() => {
        const preloadedFiles = defaultSprites.map(path => {
            const parts = path.split('/');
            const name = parts[parts.length - 1];
            return {
                name,
                path: `/${path}`,
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

            let targetDirHandle = dirHandle;
            let basePath = '';
            
            try {
                targetDirHandle = await dirHandle.getDirectoryHandle('Body');
                basePath = 'Body/';
            } catch (e) {
                // Fallback to selected root if "Body" folder is missing
                console.log("No 'Body' folder found at root, reading selected folder directly.");
            }

            for await (const entry of targetDirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.png')) {
                    pngFiles.push({ 
                        name: entry.name,
                        path: basePath + entry.name,
                        handle: entry 
                    });
                }
            }

            // Merge found files with mandatory defaults
            const mergedFiles = defaultSprites.map(path => {
                const parts = path.split('/');
                const name = parts[parts.length - 1];
                const localMatch = pngFiles.find(f => f.name === name);
                
                return {
                    name,
                    path: `/${path}`, // Fallback URL for missing local files
                    handle: localMatch ? localMatch.handle : undefined
                };
            });
            
            setFiles(mergedFiles);
            setIsLocalLoaded(true);
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    };

    const handleSaveSprite = async () => {
        if (!selectedSprite || !canvasRef.current) return;
        
        if (!selectedSprite.handle) {
            // Fallback: Download the edited canvas as a PNG if it's a preloaded file
            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = selectedSprite.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }, 'image/png');
            return;
        }

        try {
            // @ts-ignore
            const writable = await selectedSprite.handle.createWritable();
            
            const blob = await new Promise<Blob | null>(resolve => {
                canvasRef.current!.toBlob(resolve, 'image/png');
            });

            if (blob) {
                await writable.write(blob);
                await writable.close();
                alert("Saved successfully!");
            }
        } catch (err) {
            console.error("Save failed", err);
            alert("Failed to save. Make sure you have granted write permissions.");
        }
    };

    const handleExportZip = async () => {
        const zip = new JSZip();
        const bodyFolder = zip.folder("Body");
        if (!bodyFolder) return;

        // Capture current canvas state if something is selected
        let currentBlob: Blob | null = null;
        if (canvasRef.current && selectedSprite) {
            currentBlob = await new Promise(resolve => canvasRef.current!.toBlob(resolve, 'image/png'));
            if (currentBlob) {
                setModifiedBlobs(prev => ({ ...prev, [selectedSprite.name]: currentBlob! }));
            }
        }

        for (const file of files) {
            let blobToZip = modifiedBlobs[file.name];
            if (file.name === selectedSprite?.name && currentBlob) {
                blobToZip = currentBlob;
            }

            if (!blobToZip) {
                if (file.handle) {
                    blobToZip = await file.handle.getFile();
                } else {
                    const res = await fetch(file.path);
                    blobToZip = await res.blob();
                }
            }
            bodyFolder.file(file.name, blobToZip);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "ScavSkin.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const saveCanvasToMemory = () => {
        if (selectedSprite && canvasRef.current) {
            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    setModifiedBlobs(prev => ({ ...prev, [selectedSprite.name]: blob }));
                }
            }, 'image/png');
        }
    };

    const handleSpriteSelect = (newSprite: SpriteFile) => {
        saveCanvasToMemory();
        setSelectedSprite(newSprite);
    };

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

        const currentModifiedBlob = modifiedBlobs[selectedSprite.name];
        if (currentModifiedBlob) {
            img.src = URL.createObjectURL(currentModifiedBlob);
        } else if (selectedSprite.handle) {
            selectedSprite.handle.getFile().then((file: File) => {
                img.src = URL.createObjectURL(file);
            });
        } else {
            img.src = selectedSprite.path;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSprite]); // intentionally omit modifiedBlobs so it doesn't flicker when drawing

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
            <header className="top-bar">
                <span className="menu-item" onClick={handleOpenFolder} style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    [Open Skin Folder]
                </span>
                <span className="menu-item" onClick={handleSaveSprite} style={{ color: '#2196F3', fontWeight: 'bold' }}>
                    [Save Sprite]
                </span>
                <span className="menu-item" onClick={handleExportZip} style={{ color: '#FF9800', fontWeight: 'bold' }}>
                    [Export Skin (ZIP)]
                </span>
                <span className="menu-item">Edit</span>
                <span className="menu-item">View</span>
                <span className="menu-item">Tools</span>
            </header>

            <div className="main-content">
                <aside className="left-panel" style={{ width: leftPanelWidth, flexShrink: 0 }}>
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
                                            onClick={() => handleSpriteSelect(f)}
                                            style={{ 
                                                padding: '4px 8px', 
                                                cursor: 'pointer', 
                                                borderBottom: '1px solid #333',
                                                backgroundColor: selectedSprite?.name === f.name ? '#333' : 'transparent',
                                                color: isMissing ? '#ff6b6b' : (f.handle ? '#4CAF50' : '#aaa'),
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Thumbnail file={f} modifiedBlob={modifiedBlobs[f.name]} />
                                            <span>{f.name} {modifiedBlobs[f.name] ? '*' : ''} {isMissing ? '(Missing)' : (f.handle ? '(Local)' : '')}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </aside>

                <div 
                    className="resizer" 
                    onMouseDown={(e) => { 
                        e.preventDefault(); 
                        resizingPanel.current = 'left'; 
                        document.body.style.cursor = 'col-resize'; 
                    }} 
                />

                <main className="center-canvas">
                    {!selectedSprite ? (
                        <div style={{ color: '#555' }}>Select a sprite to edit</div>
                    ) : (
                        <canvas
                            ref={canvasRef}
                            className="pixel-canvas"
                            onMouseDown={(e) => { setIsDrawing(true); draw(e); }}
                            onMouseMove={draw}
                            onMouseUp={() => { setIsDrawing(false); saveCanvasToMemory(); }}
                            onMouseLeave={() => { setIsDrawing(false); saveCanvasToMemory(); }}
                        />
                    )}
                </main>

                <div 
                    className="resizer" 
                    onMouseDown={(e) => { 
                        e.preventDefault(); 
                        resizingPanel.current = 'right'; 
                        document.body.style.cursor = 'col-resize'; 
                    }} 
                />

                <aside className="right-panel" style={{ width: rightPanelWidth, flexShrink: 0 }}>
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
