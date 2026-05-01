export interface ImageManifest {
  [key: string]: string;
}

export class AssetLoader {
  private readonly images = new Map<string, HTMLImageElement>();

  async loadImages(manifest: ImageManifest, onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const entries = Object.entries(manifest);
    let loaded = 0;
    await Promise.all(
      entries.map(
        ([key, src]) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              this.images.set(key, img);
              loaded += 1;
              onProgress?.(loaded, entries.length);
              resolve();
            };
            img.onerror = () => reject(new Error(`Failed to load ${src}`));
            img.src = src;
          }),
      ),
    );
  }

  image(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }
}
