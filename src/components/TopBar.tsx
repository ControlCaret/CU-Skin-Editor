interface TopBarProps {
    skinName: string;
    setSkinName: (name: string) => void;
    isEditingName: boolean;
    setIsEditingName: (isEditing: boolean) => void;
    activeMenu: string | null;
    setActiveMenu: (menu: string | null) => void;
    handleOpenFolder: () => void;
    handleSaveSprite: () => void;
    handleExportFolder: (mode: 'bodyOnly' | 'split') => void;
    handleExportZip: (mode: 'bodyOnly' | 'split') => void;
    handleResetClick: () => void;
    showGuide: boolean;
    setShowGuide: (show: boolean) => void;
    showPixelGrid: boolean;
    setShowPixelGrid: (show: boolean) => void;
}

export function TopBar({
    skinName,
    setSkinName,
    isEditingName,
    setIsEditingName,
    activeMenu,
    setActiveMenu,
    handleOpenFolder,
    handleSaveSprite,
    handleExportFolder,
    handleExportZip,
    handleResetClick,
    showGuide,
    setShowGuide,
    showPixelGrid,
    setShowPixelGrid
}: TopBarProps) {
    return (
        <header className="top-bar">
            <div className="top-bar-controls">
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
                        className="skin-name-input"
                        style={{ width: `${Math.max(skinName.length, 6)}ch` }}
                    />
                ) : (
                    <span 
                        onClick={() => setIsEditingName(true)}
                        title="Click to edit skin name"
                        className="skin-name-display"
                    >
                        {skinName}
                    </span>
                )}
            </div>

            <div className="top-menu-group">
                <div className="menu-wrapper" onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}>
                    <span className="menu-label"><u>F</u>ile</span>
                    {activeMenu === 'file' && (
                        <div className="dropdown-menu">
                            <div className="dropdown-item" onClick={handleOpenFolder}>Open Skin Folder</div>
                            <div className="dropdown-item" onClick={handleSaveSprite}>Save Sprite</div>
                            <div className="dropdown-divider" />
                            <div className="dropdown-item" onClick={() => handleExportFolder('bodyOnly')}>Export Folder (All in Body)</div>
                            <div className="dropdown-item" onClick={() => handleExportFolder('split')}>Export Folder (Split Body/Head)</div>
                            <div className="dropdown-divider" />
                            <div className="dropdown-item" onClick={() => handleExportZip('bodyOnly')}>Export ZIP (All in Body)</div>
                            <div className="dropdown-item" onClick={() => handleExportZip('split')}>Export ZIP (Split Body/Head)</div>
                            <div className="dropdown-divider" />
                            <div className="dropdown-item danger" onClick={handleResetClick}>Reset All Changes</div>
                        </div>
                    )}
                </div>

                <div className="menu-wrapper" onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }}>
                    <span className="menu-label"><u>V</u>iew</span>
                    {activeMenu === 'view' && (
                        <div className="dropdown-menu small">
                            <div className="dropdown-item" onClick={() => setShowGuide(!showGuide)}>
                                {showGuide ? 'Hide Center Guide' : 'Show Center Guide'}
                            </div>
                            <div className="dropdown-item" onClick={() => setShowPixelGrid(!showPixelGrid)}>
                                {showPixelGrid ? 'Hide Pixel Grid' : 'Show Pixel Grid'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
