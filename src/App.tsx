import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import './App.css'
import { defaultSprites } from './defaultSprites'
import { extractPalette } from './utils/paletteExtraction'

import type { SpriteFile } from './types'
import { TopBar } from './components/TopBar'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { CanvasEditor } from './components/CanvasEditor'

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
    const [isPastedSelection, setIsPastedSelection] = useState(false);
    const [originalSelectionBounds, setOriginalSelectionBounds] = useState<{x: number, y: number, w: number, h: number} | null>(null);
    
    // Undo/Redo history
    const historyRef = useRef<{ stack: ImageData[], index: number }>({ stack: [], index: -1 });

    // Ref to hold latest state for global event listeners
    const stateRef = useRef<any>({});
    
    const [color, setColor] = useState({ r: 255, g: 0, b: 0, a: 1 });
    const [paletteColors, setPaletteColors] = useState<{r:number,g:number,b:number,a:number}[]>([]);
    const [brushSize, setBrushSize] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLElement>(null);
    
    const [leftPanelWidth, setLeftPanelWidth] = useState(480);
    const [rightPanelWidth, setRightPanelWidth] = useState(480);
    const resizingPanel = useRef<'left' | 'right' | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showPixelGrid, setShowPixelGrid] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        const preloadedFiles = defaultSprites.map(sprite => {
            const name = sprite.name;
            return {
                ...sprite,
                name,
                path: `/Original/Body/${name}`,
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

            // Initialize history with the loaded state
            const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            historyRef.current = { stack: [initialData], index: 0 };

            // Extract Palette
            const extracted = extractPalette(initialData, 14);
            setPaletteColors(extracted);

            if (containerRef.current) {
                const pad = 180;
                const maxZoomX = Math.floor((containerRef.current.clientWidth - pad) / img.width);
                const maxZoomY = Math.floor((containerRef.current.clientHeight - pad) / img.height);
                const fitZoom = Math.max(1, Math.min(maxZoomX, maxZoomY));
                setZoom(Math.min(100, fitZoom));
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
                e.preventDefault();
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
        if (selectedSprite && newSprite.name === selectedSprite.name) return;
        if (historyRef.current.index > 0) {
            saveCanvasToMemory();
        }
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

    const pushToHistory = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d')!;
        const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const h = historyRef.current;
        h.stack = h.stack.slice(0, h.index + 1);
        h.stack.push(data);
        if (h.stack.length > 50) {
            h.stack.shift();
        } else {
            h.index++;
        }
    };

    const undo = () => {
        const h = historyRef.current;
        if (h.index > 0 && canvasRef.current) {
            h.index--;
            const ctx = canvasRef.current.getContext('2d')!;
            ctx.putImageData(h.stack[h.index], 0, 0);
            saveCanvasToMemory();
        }
    };

    const redo = () => {
        const h = historyRef.current;
        if (h.index < h.stack.length - 1 && canvasRef.current) {
            h.index++;
            const ctx = canvasRef.current.getContext('2d')!;
            ctx.putImageData(h.stack[h.index], 0, 0);
            saveCanvasToMemory();
        }
    };

    const commitSelection = () => {
        if (selectionData && canvasBackup && selectionBounds && canvasRef.current) {
            setSelectionData(null);
            setCanvasBackup(null);
            pushToHistory();
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
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
            
            if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (stateRef.current.redo) stateRef.current.redo();
            } else if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (stateRef.current.undo) stateRef.current.undo();
            } else if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
                copyToClipboard();
            } else if (!cmdOrCtrl && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p') {
                stateRef.current.setTool('pencil');
            } else if (!cmdOrCtrl && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e') {
                stateRef.current.setTool('eraser');
            } else if (!cmdOrCtrl && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
                stateRef.current.setTool('fill');
            } else if (!cmdOrCtrl && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') {
                stateRef.current.setTool('eyedropper');
            } else if (!cmdOrCtrl && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
                stateRef.current.setTool('select');
            } else if (!cmdOrCtrl && !e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                stateRef.current.setActiveMenu(stateRef.current.activeMenu === 'file' ? null : 'file');
            } else if (!cmdOrCtrl && !e.shiftKey && e.altKey && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                stateRef.current.setActiveMenu(stateRef.current.activeMenu === 'view' ? null : 'view');
            } else if (cmdOrCtrl && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (stateRef.current.handleSaveSprite) {
                    stateRef.current.handleSaveSprite();
                }
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
                        stateRef.current.setSelectionData(null);
                        stateRef.current.setSelectionBounds(null);
                        stateRef.current.setCanvasBackup(null);
                        stateRef.current.setIsDraggingSelection(false);
                        saveCanvasToMemory();
                    } else if (canvasRef.current) {
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
                        stateRef.current.setOriginalSelectionBounds({ ...selectionBounds });
                        stateRef.current.setIsPastedSelection(false);
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
            } else if (e.key === 'Enter') {
                e.preventDefault();
                stateRef.current.commitSelection();
                stateRef.current.setSelectionBounds(null);
                stateRef.current.setIsDrawingSelection(false);
                stateRef.current.setIsDraggingSelection(false);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                const { canvasBackup, isPastedSelection, selectionData, originalSelectionBounds, saveCanvasToMemory } = stateRef.current;
                
                if (canvasBackup && canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d')!;
                    ctx.putImageData(canvasBackup, 0, 0);
                    
                    if (!isPastedSelection && selectionData && originalSelectionBounds) {
                        const offscreen = document.createElement('canvas');
                        offscreen.width = originalSelectionBounds.w;
                        offscreen.height = originalSelectionBounds.h;
                        offscreen.getContext('2d')!.putImageData(selectionData, 0, 0);
                        ctx.drawImage(offscreen, originalSelectionBounds.x, originalSelectionBounds.y);
                    }
                }
                
                stateRef.current.setSelectionBounds(null);
                stateRef.current.setSelectionData(null);
                stateRef.current.setCanvasBackup(null);
                stateRef.current.setIsDraggingSelection(false);
                stateRef.current.setIsDrawingSelection(false);
                stateRef.current.setIsPastedSelection(false);
                stateRef.current.setOriginalSelectionBounds(null);
                if (saveCanvasToMemory) {
                    saveCanvasToMemory();
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
                                setIsPastedSelection(true);
                                setOriginalSelectionBounds(null);
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

        if (e.altKey) {
            const ctx = canvasRef.current.getContext('2d')!;
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[3] > 0) {
                setColor({ r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] / 255 });
            }
            return;
        }

        if (tool === 'fill') {
            floodFill(e);
            pushToHistory();
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
                    
                    setOriginalSelectionBounds({ ...selectionBounds });
                    setIsPastedSelection(false);
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
            saveCanvasToMemory();
        } else if (isDrawing) {
            setIsDrawing(false);
            pushToHistory();
            saveCanvasToMemory();
            
            setPaletteColors(prev => {
                const exists = prev.some(c => c.r === color.r && c.g === color.g && c.b === color.b && c.a === color.a);
                if (exists) return prev;
                const newPalette = [color, ...prev];
                return newPalette.slice(0, 14);
            });
        }
    };

    const draw = (x: number, y: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (tool === 'eyedropper') {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[3] > 0) { // If not transparent
                setColor({ r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] / 255 });
            }
        } else {
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
            const radius = brushSize / 2;
            const centerOffset = brushSize % 2 === 0 ? 0.5 : 0;
            const limit = Math.ceil(radius);
            for (let dy = -limit; dy <= limit; dy++) {
                for (let dx = -limit; dx <= limit; dx++) {
                    const distSq = Math.pow(dx - centerOffset, 2) + Math.pow(dy - centerOffset, 2);
                    // Use a slightly smaller threshold for a rounder look on small sizes
                    if (distSq <= radius * radius) {
                        if (tool === 'eraser') {
                            ctx.clearRect(x + dx, y + dy, 1, 1);
                        } else {
                            ctx.fillRect(x + dx, y + dy, 1, 1);
                        }
                    }
                }
            }
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

        const targetA = Math.round(color.a * 255);
        
        // Avoid infinite loop if clicking on same color
        if (startR === color.r && startG === color.g && startB === color.b && startA === targetA) return;

        const matchStartColor = (idx: number) => {
            return data[idx] === startR && data[idx + 1] === startG && data[idx + 2] === startB && data[idx + 3] === startA;
        };

        const colorPixel = (idx: number) => {
                data[idx] = color.r;
                data[idx + 1] = color.g;
                data[idx + 2] = color.b;
                data[idx + 3] = targetA;
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
            const newBlobs: Record<string, Blob> = {};

            if (dirHandle.name.toLowerCase() === 'body') {
                setSkinName('Unnamed_Skin');
            } else {
                setSkinName(dirHandle.name.replace(/\s+/g, '_'));
            }

            // Helper function to read a directory
            const readDir = async (handle: any, folderPrefix: string) => {
                for await (const entry of handle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.png')) {
                        pngFiles.push({ 
                            name: entry.name,
                            path: folderPrefix + entry.name,
                            handle: entry 
                        });
                        // @ts-ignore
                        const file = await entry.getFile();
                        newBlobs[entry.name] = file;
                    }
                }
            };

            let foundAny = false;
            
            // 1. Read Body folder if it exists
            try {
                const bodyHandle = await dirHandle.getDirectoryHandle('Body');
                await readDir(bodyHandle, 'Body/');
                foundAny = true;
            } catch (e) {
                console.log("No 'Body' folder found.");
            }

            // 2. Read Head folder if it exists
            try {
                const headHandle = await dirHandle.getDirectoryHandle('Head');
                await readDir(headHandle, 'Head/');
                foundAny = true;
            } catch (e) {
                console.log("No 'Head' folder found.");
            }

            // 3. Fallback to root directory if neither Body nor Head was found
            if (!foundAny) {
                console.log("Reading selected folder directly.");
                await readDir(dirHandle, '');
            }

            // Merge found files with mandatory defaults
            const mergedFiles = defaultSprites.map(sprite => {
                const name = sprite.name;
                const localMatch = pngFiles.find(f => f.name === name);
                
                return {
                    ...sprite,
                    name,
                    path: `/Original/Body/${name}`, // Fallback URL for missing local files
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

    const handleExportZip = async (mode: 'bodyOnly' | 'split') => {
        const zip = new JSZip();
        const baseFolder = zip.folder(skinName);
        if (!baseFolder) return;

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

            let folderName = 'Body';
            if (mode === 'split') {
                if (file.category) {
                    folderName = file.category;
                }
            }

            const targetFolder = baseFolder.folder(folderName);
            if (targetFolder) {
                targetFolder.file(file.name, blobToZip);
            }
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

    const handleExportFolder = async (mode: 'bodyOnly' | 'split') => {
        try {
            // @ts-ignore
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            
            // Capture current canvas state if something is selected
            let currentBlob: Blob | null = null;
            if (canvasRef.current && selectedSprite) {
                currentBlob = await new Promise(resolve => canvasRef.current!.toBlob(resolve, 'image/png'));
                if (currentBlob) {
                    setModifiedBlobs(prev => ({ ...prev, [selectedSprite.name]: currentBlob! }));
                }
            }
            
            for (const file of files) {
                let blobToExport = modifiedBlobs[file.name];
                if (file.name === selectedSprite?.name && currentBlob) {
                    blobToExport = currentBlob;
                }

                if (!blobToExport) {
                    if (file.handle) {
                        blobToExport = await file.handle.getFile();
                    } else {
                        const res = await fetch(file.path);
                        blobToExport = await res.blob();
                    }
                }

                let folderName = 'Body';
                if (mode === 'split' && file.category) {
                    folderName = file.category;
                }
                
                const skinFolderHandle = await dirHandle.getDirectoryHandle(skinName, { create: true });
                const targetFolderHandle = await skinFolderHandle.getDirectoryHandle(folderName, { create: true });
                const fileHandle = await targetFolderHandle.getFileHandle(file.name, { create: true });
                
                // @ts-ignore
                const writable = await fileHandle.createWritable();
                await writable.write(blobToExport);
                await writable.close();
            }
            
            alert("Exported to folder successfully!");
        } catch (error) {
            console.error("Folder export failed:", error);
        }
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

    const rgbaToHex = (c: {r:number,g:number,b:number,a:number}) => {
        const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
        if (c.a === 1) return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
        return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}${toHex(c.a * 255)}`;
    };

    // Update stateRef every render so global listeners have access to latest state/functions
    stateRef.current = {
        selectionData, selectionBounds, tool, canvasBackup, isPastedSelection, originalSelectionBounds,
        setTool, setSelectionBounds, setSelectionData, 
        setCanvasBackup, setIsDraggingSelection, setIsDrawingSelection,
        setIsPastedSelection, setOriginalSelectionBounds,
        commitSelection, saveCanvasToMemory, handleSaveSprite,
        undo, redo, activeMenu, setActiveMenu
    };

    const handleAutoZoom = () => {
        if (containerRef.current && canvasSize.w > 0) {
            const pad = 180;
            const maxZoomX = Math.floor((containerRef.current.clientWidth - pad) / canvasSize.w);
            const maxZoomY = Math.floor((containerRef.current.clientHeight - pad) / canvasSize.h);
            const fitZoom = Math.max(1, Math.min(maxZoomX, maxZoomY));
            setZoom(Math.min(100, fitZoom));
        }
    };

    return (
        <div className="app-container">
            <TopBar 
                skinName={skinName}
                setSkinName={setSkinName}
                isEditingName={isEditingName}
                setIsEditingName={setIsEditingName}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                handleOpenFolder={handleOpenFolder}
                handleSaveSprite={handleSaveSprite}
                handleExportFolder={handleExportFolder}
                handleExportZip={handleExportZip}
                handleResetClick={handleResetClick}
                showGuide={showGuide}
                setShowGuide={setShowGuide}
                showPixelGrid={showPixelGrid}
                setShowPixelGrid={setShowPixelGrid}
            />

            <div className="main-content">
                <LeftPanel 
                    leftPanelWidth={leftPanelWidth}
                    files={files}
                    isLocalLoaded={isLocalLoaded}
                    selectedSprite={selectedSprite}
                    modifiedBlobs={modifiedBlobs}
                    handleSpriteSelect={handleSpriteSelect}
                />

                <div 
                    className="resizer" 
                    onMouseDown={(e) => { 
                        e.preventDefault(); 
                        resizingPanel.current = 'left'; 
                        document.body.style.cursor = 'col-resize'; 
                    }} 
                />

                <CanvasEditor
                    containerRef={containerRef}
                    selectedSprite={selectedSprite}
                    canvasSize={canvasSize}
                    zoom={zoom}
                    setZoom={setZoom}
                    handleAutoZoom={handleAutoZoom}
                    canvasRef={canvasRef}
                    handleMouseDown={handleMouseDown}
                    handleMouseMove={handleMouseMove}
                    handleMouseUp={handleMouseUp}
                    showGuide={showGuide}
                    showPixelGrid={showPixelGrid}
                    tool={tool}
                    selectionBounds={selectionBounds}
                />

                <div 
                    className="resizer" 
                    onMouseDown={(e) => { 
                        e.preventDefault(); 
                        resizingPanel.current = 'right'; 
                        document.body.style.cursor = 'col-resize'; 
                    }} 
                />

                <RightPanel
                    rightPanelWidth={rightPanelWidth}
                    tool={tool}
                    setTool={setTool}
                    brushSize={brushSize}
                    setBrushSize={setBrushSize}
                    color={color}
                    setColor={setColor}
                    paletteColors={paletteColors}
                    rgbaToHex={rgbaToHex}
                />
            </div>
        </div>
    );
}

export default App;
