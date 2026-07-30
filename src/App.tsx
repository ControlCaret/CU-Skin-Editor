import './App.css'

function App() {
    return (
        <div className="app-container">
            {/* Top Bar for Menus */}
            <header className="top-bar">
                <span className="menu-item">File</span>
                <span className="menu-item">Edit</span>
                <span className="menu-item">View</span>
                <span className="menu-item">Tools</span>
            </header>

            <div className="main-content">
                {/* Left Panel for Sprite List */}
                <aside className="left-panel">
                    <h3>Sprites</h3>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                        No folder loaded.
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
                        Pencil<br />
                        Eraser<br />
                        Color Picker
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default App
