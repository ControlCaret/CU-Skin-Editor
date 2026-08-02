import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import './App.css'
import { defaultSprites } from './defaultSprites'
import { Pencil, Eraser, Pipette, PaintBucket, SquareDashed } from 'lucide-react'
import { SketchPicker } from 'react-color'

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};

interface SpriteFile {
    name: string;
    path: string; // URL for the default fallback sprite
    handle?: any; // FileSystemFileHandle if loaded from local
}

function Thumbnail({ file, modifiedBlob }: { file: SpriteFile, modifiedBlob?: Blob }) {
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

function App() {
    const [files, setFiles] = useState<SpriteFile[]>([]);
    const [modifiedBlobs, setModifiedBlobs] = useState<Record<string, Blob>>({});
    const [skinName, setSkinName] = useState('Original');
    const [isLocalLoaded, setIsLocalLoaded] = useState(false);
    const [isRestored, setIsRestored] = useState(false);
    
    const [selectedSprite, setSelectedSprite] = useState<SpriteFile | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pencil' | 'eraser' | 'eyedropper' | 'fill' | 'select'>('pencil');
    
    // Selection state
    const [selectionBounds, setSelectionBounds] = useState<{x: number, y: number, w: number, h: number} | null>(null);
    const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
    const [isDrawingSelection, setIsDrawingSelection] = useState(false);
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const [selectionData, setSelectionData] = useState<ImageData | null>(null);
    const [canvasBackup, setCanvasBackup] = useState<ImageData | null>(null);
    const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);
    
    // Ref to hold latest state for global event listeners
    const stateRef = useRef<any>({});
    
    const [color, setColor] = useState('#ff0000');
    const [zoom, setZoom] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLElement>(null);
    
    const [leftPanelWidth, setLeftPanelWidth] = useState(480);
    const [rightPanelWidth, setRightPanelWidth] = useState(400);
    const resizingPanel = useRef<'left' | 'right' | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);

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

    useEffect(() => {
        const loadFromLocalStorage = async () => {
            const savedName = localStorage.getItem('cu-skin-editor-skinName');
            if (savedName) setSkinName(savedName);

            const data = localStorage.getItem('cu-skin-editor-blobs');
            if (data) {
                try {
                    const store: Record<string, string> = JSON.parse(data);
                    const blobs: Record<string, Blob> = {};
                    for (const [name, dataUrl] of Object.entries(store)) {
                        const res = await fetch(dataUrl);
                        blobs[name] = await res.blob();
                    }
                    setModifiedBlobs(blobs);
                } catch (e) {
                    console.error("Failed to parse local storage data", e);
                }
            }
            setIsRestored(true);
        };
        loadFromLocalStorage();
    }, []);

    useEffect(() => {
        if (!isRestored) return; // Prevent overwriting before initial load finishes

        const saveToLocalStorage = async () => {
            const promises = Object.entries(modifiedBlobs).map(async ([name, blob]) => {
                return new Promise<{name: string, data: string}>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve({ name, data: reader.result as string });
                    reader.readAsDataURL(blob);
                });
            });
            const results = await Promise.all(promises);
            const store: Record<string, string> = {};
            results.forEach(r => store[r.name] = r.data);
            localStorage.setItem('cu-skin-editor-blobs', JSON.stringify(store));
            localStorage.setItem('cu-skin-editor-skinName', skinName);
        };
        saveToLocalStorage();
    }, [modifiedBlobs, skinName, isRestored]);

    useEffect(() => {
        if (!selectedSprite || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            setCanvasSize({ w: img.width, h: img.height });
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Auto-calculate optimal zoom to fit container
            if (containerRef.current) {
                const pad = 60; // Padding
                const maxZoomX = Math.floor((containerRef.current.clientWidth - pad) / img.width);
                const maxZoomY = Math.floor((containerRef.current.clientHeight - pad) / img.height);
                const fitZoom = Math.max(1, Math.min(maxZoomX, maxZoomY));
                setZoom(Math.min(100, fitZoom)); // Clamp max auto-zoom to 100x
            }
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
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault(); // Stop browser from zooming
                if (e.deltaY < 0) setZoom(z => Math.min(100, z + 1));
                else setZoom(z => Math.max(1, z - 1));
            }
        };

        // Must be { passive: false } to allow e.preventDefault()
        container.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

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

    const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: Math.floor((e.clientX - rect.left) * scaleX),
            y: Math.floor((e.clientY - rect.top) * scaleY)
        };
    };

    const commitSelection = () => {
        if (selectionData && canvasBackup && selectionBounds && canvasRef.current) {
            setSelectionData(null);
            setCanvasBackup(null);
            saveCanvasToMemory();
        }
    };

    // --- Global Keyboard & Paste Listeners ---
    useEffect(() => {
        const copyToClipboard = () => {
            const { selectionData, selectionBounds } = stateRef.current;
            let dataToCopy: ImageData | null = null;

            if (selectionData) {
                dataToCopy = selectionData;
            } else if (selectionBounds && canvasRef.current) {
                dataToCopy = canvasRef.current.getContext('2d')!.getImageData(
                    selectionBounds.x, selectionBounds.y, selectionBounds.w, selectionBounds.h
                );
            }

            if (!dataToCopy) return;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = dataToCopy.width;
            tempCanvas.height = dataToCopy.height;
            tempCanvas.getContext('2d')!.putImageData(dataToCopy, 0, 0);
            
            tempCanvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        console.log("Copied to clipboard");
                    } catch (e) {
                        console.error("Failed to copy", e);
                    }
                }
            }, 'image/png');
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
            
            if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
                copyToClipboard();
            } else if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                stateRef.current.setTool('select');
                if (canvasRef.current) {
                    if (stateRef.current.selectionData) {
                        stateRef.current.commitSelection();
                    }
                    stateRef.current.setSelectionBounds({
                        x: 0,
                        y: 0,
                        w: canvasRef.current.width,
                        h: canvasRef.current.height
                    });
                    stateRef.current.setSelectionData(null);
                    stateRef.current.setIsDrawingSelection(false);
                    stateRef.current.setIsDraggingSelection(false);
                }
            } else if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                stateRef.current.commitSelection();
                stateRef.current.setSelectionBounds(null);
                stateRef.current.setIsDrawingSelection(false);
                stateRef.current.setIsDraggingSelection(false);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                const { selectionBounds, selectionData, saveCanvasToMemory } = stateRef.current;
                if (selectionBounds) {
                    if (selectionData) {
                        // Already floating, just discard it to leave the hole
                        stateRef.current.setSelectionData(null);
                        stateRef.current.setSelectionBounds(null);
                        stateRef.current.setCanvasBackup(null);
                        stateRef.current.setIsDraggingSelection(false);
                        saveCanvasToMemory();
                    } else if (canvasRef.current) {
                        // Not floating, erase pixels in the box
                        const ctx = canvasRef.current.getContext('2d')!;
                        ctx.clearRect(selectionBounds.x, selectionBounds.y, selectionBounds.w, selectionBounds.h);
                        stateRef.current.setSelectionBounds(null);
                        saveCanvasToMemory();
                    }
                }
            } else if (e.key.startsWith('Arrow')) {
                const { selectionBounds, selectionData, canvasBackup } = stateRef.current;
                if (selectionBounds && canvasRef.current) {
                    e.preventDefault();
                    let currentData = selectionData;
                    let backup = canvasBackup;
                    const ctx = canvasRef.current.getContext('2d')!;
                    
                    if (!currentData) {
                        currentData = ctx.getImageData(selectionBounds.x, selectionBounds.y, selectionBounds.w, selectionBounds.h);
                        ctx.clearRect(selectionBounds.x, selectionBounds.y, selectionBounds.w, selectionBounds.h);
                        backup = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
                        stateRef.current.setSelectionData(currentData);
                        stateRef.current.setCanvasBackup(backup);
                        stateRef.current.setIsDraggingSelection(true);
                    }
                    
                    let dx = 0; let dy = 0;
                    if (e.key === 'ArrowUp') dy = -1;
                    if (e.key === 'ArrowDown') dy = 1;
                    if (e.key === 'ArrowLeft') dx = -1;
                    if (e.key === 'ArrowRight') dx = 1;
                    
                    const newX = selectionBounds.x + dx;
                    const newY = selectionBounds.y + dy;
                    
                    if (backup) ctx.putImageData(backup, 0, 0);
                    
                    const offscreen = document.createElement('canvas');
                    offscreen.width = selectionBounds.w;
                    offscreen.height = selectionBounds.h;
                    offscreen.getContext('2d')!.putImageData(currentData, 0, 0);
                    ctx.drawImage(offscreen, newX, newY);
                    
                    stateRef.current.setSelectionBounds({ ...selectionBounds, x: newX, y: newY });
                }
            } else if (e.key === 'Escape') {
                const { canvasBackup } = stateRef.current;
                if (canvasBackup && canvasRef.current) {
                    canvasRef.current.getContext('2d')!.putImageData(canvasBackup, 0, 0);
                }
                stateRef.current.setSelectionBounds(null);
                stateRef.current.setSelectionData(null);
                stateRef.current.setCanvasBackup(null);
                stateRef.current.setIsDraggingSelection(false);
                stateRef.current.setIsDrawingSelection(false);
                // Trigger a re-render/save
                if (canvasRef.current && selectedSprite) {
                    canvasRef.current.toBlob((blob) => {
                        if (blob) {
                            setModifiedBlobs(prev => ({ ...prev, [selectedSprite.name]: blob }));
                        }
                    }, 'image/png');
                }
            }
        };

        const handleGlobalPaste = (e: ClipboardEvent) => {
            if (e.clipboardData) {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) {
                            const img = new Image();
                            img.src = URL.createObjectURL(blob);
                            img.onload = () => {
                                if (!canvasRef.current) return;
                                setTool('select');
                                
                                const ctx = canvasRef.current.getContext('2d')!;
                                const tempCanvas = document.createElement('canvas');
                                tempCanvas.width = img.width;
                                tempCanvas.height = img.height;
                                const tempCtx = tempCanvas.getContext('2d')!;
                                tempCtx.drawImage(img, 0, 0);
                                const data = tempCtx.getImageData(0, 0, img.width, img.height);
                                
                                const startX = 0;
                                const startY = 0;
                                
                                setSelectionBounds({ x: startX, y: startY, w: img.width, h: img.height });
                                setSelectionData(data);
                                setCanvasBackup(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
                                setIsDraggingSelection(false);
                                
                                ctx.drawImage(tempCanvas, startX, startY);
                            };
                        }
                        break;
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('paste', handleGlobalPaste);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('paste', handleGlobalPaste);
        };
    }, []);

    useEffect(() => {
        if (tool !== 'select') {
            commitSelection();
            setSelectionBounds(null);
        }
    }, [tool]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const { x, y } = getCoords(e);

        if (tool === 'fill') {
            floodFill(e);
            saveCanvasToMemory();
        } else if (tool === 'select') {
            if (selectionBounds && 
                x >= selectionBounds.x && x < selectionBounds.x + selectionBounds.w &&
                y >= selectionBounds.y && y < selectionBounds.y + selectionBounds.h) {
                
                const ctx = canvasRef.current.getContext('2d')!;
                if (!selectionData) {
                    const data = ctx.getImageData(selectionBounds.x, selectionBounds.y, selectionBounds.w, selectionBounds.h);
                    setSelectionData(data);
                    ctx.clearRect(selectionBounds.x, selectionBounds.y, selectionBounds.w, selectionBounds.h);
                    setCanvasBackup(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
                }
                setIsDraggingSelection(true);
                setDragOffset({ x: x - selectionBounds.x, y: y - selectionBounds.y });
            } else {
                commitSelection();
                setSelectionStart({ x, y });
                setSelectionBounds(null);
                setSelectionData(null);
                setIsDrawingSelection(true);
            }
        } else {
            commitSelection();
            setSelectionBounds(null);
            setIsDrawing(true);
            draw(x, y);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const { x, y } = getCoords(e);

        if (tool === 'select') {
            if (isDrawingSelection && selectionStart) {
                const minX = Math.min(x, selectionStart.x);
                const minY = Math.min(y, selectionStart.y);
                const w = Math.abs(x - selectionStart.x) + 1;
                const h = Math.abs(y - selectionStart.y) + 1;
                setSelectionBounds({ x: minX, y: minY, w, h });
            } else if (isDraggingSelection && selectionBounds && dragOffset && canvasBackup && selectionData) {
                const newX = x - dragOffset.x;
                const newY = y - dragOffset.y;
                
                const ctx = canvasRef.current.getContext('2d')!;
                ctx.putImageData(canvasBackup, 0, 0);
                
                const offscreen = document.createElement('canvas');
                offscreen.width = selectionBounds.w;
                offscreen.height = selectionBounds.h;
                offscreen.getContext('2d')!.putImageData(selectionData, 0, 0);
                ctx.drawImage(offscreen, newX, newY);
                
                setSelectionBounds({ ...selectionBounds, x: newX, y: newY });
            }
        } else if (isDrawing) {
            draw(x, y);
        }
    };

    const handleMouseUp = () => {
        if (isDrawingSelection) {
            setIsDrawingSelection(false);
            if (selectionBounds && (selectionBounds.w === 0 || selectionBounds.h === 0)) {
                setSelectionBounds(null);
            }
        } else if (isDraggingSelection) {
            setIsDraggingSelection(false);
            // Do not overwrite canvasBackup to prevent stamping on multiple moves.
            saveCanvasToMemory();
        } else if (isDrawing) {
            setIsDrawing(false);
            saveCanvasToMemory();
        }
    };

    const draw = (x: number, y: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (tool === 'eraser') {
            ctx.clearRect(x, y, 1, 1);
        } else if (tool === 'eyedropper') {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[3] > 0) { // If not transparent
                setColor(rgbToHex(pixel[0], pixel[1], pixel[2]));
            }
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
    };

    const floodFill = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const startX = Math.floor((e.clientX - rect.left) * scaleX);
        const startY = Math.floor((e.clientY - rect.top) * scaleY);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const getPixelIdx = (x: number, y: number) => (y * canvas.width + x) * 4;

        const startIdx = getPixelIdx(startX, startY);
        const startR = data[startIdx];
        const startG = data[startIdx + 1];
        const startB = data[startIdx + 2];
        const startA = data[startIdx + 3];

        const hexToRgb = (hex: string) => {
            const bigint = parseInt(hex.slice(1), 16);
            return {
                r: (bigint >> 16) & 255,
                g: (bigint >> 8) & 255,
                b: bigint & 255
            };
        };
        const targetColor = hexToRgb(color);

        // Avoid infinite loop if clicking on same color
        if (startR === targetColor.r && startG === targetColor.g && startB === targetColor.b && startA === 255) return;

        const matchStartColor = (idx: number) => {
            return data[idx] === startR && data[idx + 1] === startG && data[idx + 2] === startB && data[idx + 3] === startA;
        };

        const colorPixel = (idx: number) => {
            data[idx] = targetColor.r;
            data[idx + 1] = targetColor.g;
            data[idx + 2] = targetColor.b;
            data[idx + 3] = 255;
        };

        colorPixel(startIdx);
        const queue = [[startX, startY]];
        
        while (queue.length > 0) {
            const [x, y] = queue.shift()!;
            
            const neighbors = [
                [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
            ];

            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                    const nIdx = getPixelIdx(nx, ny);
                    if (matchStartColor(nIdx)) {
                        colorPixel(nIdx);
                        queue.push([nx, ny]);
                    }
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
    };

    const handleOpenFolder = async () => {
        if (Object.keys(modifiedBlobs).length > 0) {
            if (!window.confirm("Opening a new skin folder will discard your current unsaved changes. Do you want to continue?")) {
                return;
            }
        }

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

            if (dirHandle.name.toLowerCase() === 'body') {
                setSkinName('Unnamed_Skin');
            } else {
                setSkinName(dirHandle.name.replace(/\s+/g, '_'));
            }

            const newBlobs: Record<string, Blob> = {};

            for await (const entry of targetDirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.png')) {
                    pngFiles.push({ 
                        name: entry.name,
                        path: basePath + entry.name,
                        handle: entry 
                    });
                    // Read file and add to newBlobs to cache in localStorage
                    // @ts-ignore
                    const file = await entry.getFile();
                    newBlobs[entry.name] = file;
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
            setModifiedBlobs(newBlobs); // Replace previous edits with the newly loaded skin
            setIsLocalLoaded(true);
            
            // Force canvas to update if a sprite is currently selected
            if (selectedSprite) {
                setSelectedSprite({ ...selectedSprite });
            }
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
        const bodyFolder = zip.folder(`${skinName}/Body`);
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
        a.download = `${skinName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleResetClick = () => {
        setTimeout(() => {
            if (window.confirm("Are you sure you want to discard all changes and reset? This cannot be undone.")) {
                setModifiedBlobs({});
                setSkinName("Original");
                localStorage.removeItem('cu-skin-editor-blobs');
                localStorage.removeItem('cu-skin-editor-skinName');
                if (selectedSprite && canvasRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                    // Force reload from original file
                    setSelectedSprite({ ...selectedSprite }); 
                }
            }
        }, 10);
    };

    // Update stateRef every render so global listeners have access to latest state/functions
    stateRef.current = {
        selectionData, selectionBounds, tool, canvasBackup,
        setTool, setSelectionBounds, setSelectionData, 
        setCanvasBackup, setIsDraggingSelection, setIsDrawingSelection,
        commitSelection, saveCanvasToMemory
    };

    return (
        <div className="app-container">
            <header className="top-bar">
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '20px' }}>
                    {isEditingName ? (
                            <input 
                                type="text" 
                                value={skinName}
                                onChange={(e) => setSkinName(e.target.value.replace(/\s+/g, '_'))}
                                onBlur={() => {
                                    if (!skinName.trim()) setSkinName('Unnamed_Skin');
                                    setIsEditingName(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (!skinName.trim()) setSkinName('Unnamed_Skin');
                                        setIsEditingName(false);
                                    }
                                }}
                                autoFocus
                                style={{ 
                                    background: 'transparent', 
                                    color: 'white', 
                                    border: '1px solid transparent',
                                    borderBottom: '1px solid #aaa',
                                    outline: 'none',
                                    padding: '2px 5px', 
                                    fontSize: '16px', 
                                    fontWeight: 'bold', 
                                    width: `${Math.max(skinName.length, 6)}ch`,
                                    fontFamily: 'inherit'
                                }}
                            />
                    ) : (
                        <span 
                            onClick={() => setIsEditingName(true)}
                            title="Click to edit skin name"
                            style={{ 
                                cursor: 'text', fontWeight: 'bold', fontSize: '16px', 
                                padding: '2px 5px', border: '1px solid transparent' 
                            }}
                        >
                            {skinName}
                        </span>
                    )}
                </div>
                <span className="menu-item" onClick={handleOpenFolder} style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    [Open Skin Folder]
                </span>
                <span className="menu-item" onClick={handleSaveSprite} style={{ color: '#2196F3', fontWeight: 'bold' }}>
                    [Save Sprite]
                </span>
                <span className="menu-item" onClick={handleExportZip} style={{ color: '#FF9800', fontWeight: 'bold' }}>
                    [Export Skin (ZIP)]
                </span>
                <span className="menu-item" onClick={handleResetClick} style={{ color: '#F44336', fontWeight: 'bold' }}>
                    [Reset All Changes]
                </span>
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

                <main className="center-canvas" ref={containerRef}>
                    {!selectedSprite ? (
                        <div style={{ color: '#555' }}>Select a sprite to edit</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ position: 'relative', width: `${canvasSize.w * zoom}px`, height: `${canvasSize.h * zoom}px` }}>
                            <canvas
                                ref={canvasRef}
                                className="pixel-canvas"
                                style={{ width: '100%', height: '100%' }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            />
                            {tool === 'select' && selectionBounds && (
                                <div style={{
                                    position: 'absolute',
                                    left: selectionBounds.x * zoom,
                                    top: selectionBounds.y * zoom,
                                    width: selectionBounds.w * zoom,
                                    height: selectionBounds.h * zoom,
                                    border: '1px dashed #fff',
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    pointerEvents: 'none'
                                }} />
                            )}
                        </div>
                        </div>
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                            <button 
                                onClick={() => setTool('pencil')}
                                style={{ 
                                    flex: '1 1 40%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                    padding: '10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                                    backgroundColor: tool === 'pencil' ? '#4CAF50' : '#333',
                                    color: tool === 'pencil' ? '#fff' : '#aaa',
                                    boxShadow: tool === 'pencil' ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Pencil size={24} />
                                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Pencil</span>
                            </button>
                            <button 
                                onClick={() => setTool('eraser')}
                                style={{ 
                                    flex: '1 1 40%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                    padding: '10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                                    backgroundColor: tool === 'eraser' ? '#F44336' : '#333',
                                    color: tool === 'eraser' ? '#fff' : '#aaa',
                                    boxShadow: tool === 'eraser' ? '0 0 10px rgba(244, 67, 54, 0.5)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Eraser size={24} />
                                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Eraser</span>
                            </button>
                            <button 
                                onClick={() => setTool('fill')}
                                style={{ 
                                    flex: '1 1 40%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                    padding: '10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                                    backgroundColor: tool === 'fill' ? '#FF9800' : '#333',
                                    color: tool === 'fill' ? '#fff' : '#aaa',
                                    boxShadow: tool === 'fill' ? '0 0 10px rgba(255, 152, 0, 0.5)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <PaintBucket size={24} />
                                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Fill</span>
                            </button>
                            <button 
                                onClick={() => setTool('eyedropper')}
                                style={{ 
                                    flex: '1 1 30%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                    padding: '10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                                    backgroundColor: tool === 'eyedropper' ? '#2196F3' : '#333',
                                    color: tool === 'eyedropper' ? '#fff' : '#aaa',
                                    boxShadow: tool === 'eyedropper' ? '0 0 10px rgba(33, 150, 243, 0.5)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Pipette size={24} />
                                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Pick</span>
                            </button>
                            <button 
                                onClick={() => setTool('select')}
                                style={{ 
                                    flex: '1 1 30%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                    padding: '10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                                    backgroundColor: tool === 'select' ? '#9C27B0' : '#333',
                                    color: tool === 'select' ? '#fff' : '#aaa',
                                    boxShadow: tool === 'select' ? '0 0 10px rgba(156, 39, 176, 0.5)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <SquareDashed size={24} />
                                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Select</span>
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                            <SketchPicker 
                                color={color} 
                                onChange={(c) => setColor(c.hex)}
                                disableAlpha={true}
                                styles={{ 
                                    default: { 
                                        picker: { background: '#222', border: '1px solid #444', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', width: '100%', boxSizing: 'border-box' } 
                                    } 
                                }}
                            />
                        </div>
                        <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                Zoom: {zoom}x
                                <input 
                                    type="range" 
                                    min="1" max="100" 
                                    value={zoom} 
                                    onChange={e => setZoom(Number(e.target.value))} 
                                />
                            </label>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default App;
