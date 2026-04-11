const { app, BrowserWindow } = require("electron");
const path = require("path");

// Explicitly tell Linux desktop environments (like GNOME/Wayland) 
// to map the running window to the Flatpak .desktop file.
if (process.platform === "linux") {
    app.setDesktopName("com.hubertbanas.sokoban.desktop");

    // Force the window's WM_CLASS to match the capitalized productName
    app.setName("Sokoban");
}

function createWindow() {
    // Check if the OS is Windows
    const isWindows = process.platform === "win32";

    // Dynamically assign the icon path based on the operating system
    const iconPath = isWindows
        ? path.join(__dirname, "public", "icon.ico")
        : path.join(__dirname, "public", "icon.png");

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: iconPath,
    });

    win.loadFile(path.join(__dirname, "dist", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});