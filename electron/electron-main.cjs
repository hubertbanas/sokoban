const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

const isMac = process.platform === "darwin";

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

    // Jump up one directory level (..) to find the public folder
    const iconPath = isWindows
        ? path.join(__dirname, "..", "public", "icon.ico")
        : path.join(__dirname, "..", "public", "icon.png");

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: !isMac,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: iconPath,
    });

    if (!isMac) {
        win.setMenu(null);
    }

    // Jump up one directory level (..) to find the dist folder
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

function configureApplicationMenu() {
    if (!isMac) {
        Menu.setApplicationMenu(null);
        return;
    }

    const template = [
        {
            label: app.name,
            submenu: [
                { role: "about" },
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" },
            ],
        },
        {
            label: "Window",
            submenu: [
                { role: "minimize" },
                { role: "zoom" },
                { type: "separator" },
                { role: "togglefullscreen" },
                { role: "front" },
            ],
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
    configureApplicationMenu();
    createWindow();
});

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