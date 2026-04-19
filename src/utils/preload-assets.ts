const gameAssetModules = import.meta.glob("../assets/**/*", {
    eager: true,
    import: "default",
});

const gameAssetUrls = Object.values(gameAssetModules) as string[];

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);

function hasImageExtension(url: string) {
    const cleanUrl = url.split("?")[0].toLowerCase();
    return Array.from(imageExtensions).some((ext) => cleanUrl.endsWith(ext));
}

function preloadImage(url: string): Promise<void> {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = url;
    });
}

function preloadGeneric(url: string): Promise<void> {
    return fetch(url, { cache: "force-cache" })
        .then(() => undefined)
        .catch(() => undefined);
}

function preloadAsset(url: string): Promise<void> {
    if (hasImageExtension(url)) {
        return preloadImage(url);
    }

    return preloadGeneric(url);
}

export async function preloadGameAssets(): Promise<void> {
    await Promise.allSettled(gameAssetUrls.map((url) => preloadAsset(url)));
}
