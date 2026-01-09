// js/imageManager.js

export class ImageManager {
    constructor() {
        this.cache = new Map();
        this.loading = new Set();
    }
    
    /**
     * Obtiene una imagen.
     * @param {string} path - Ruta relativa del JSON (ej: "256/0_0.webp")
     * @param {string} city - Ciudad actual (ej: "madrid")
     */
    getImage(path, city) {
        if (!path) return null;

        // Normalizar path: Construimos la ruta absoluta basada en la ciudad
        let normalizedPath = path;
        
        // Si no es una URL absoluta y no empieza ya por images/
        if (!path.startsWith('http') && !path.startsWith('images/')) {
            // AQUI ESTA EL CAMBIO: Inyectamos la ciudad
            normalizedPath = `images/${city}/${path}`;
        }
        
        // Si ya está en cache, devolverla
        if (this.cache.has(normalizedPath)) {
            return this.cache.get(normalizedPath);
        }
        
        // Si ya se está cargando, devolver null
        if (this.loading.has(normalizedPath)) {
            return null;
        }
        
        // Iniciar carga
        this.loadImage(normalizedPath);
        return null;
    }
    
    async loadImage(path) {
        this.loading.add(path);
        
        try {
            const img = new Image();
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = path;
            });
            
            this.cache.set(path, img);
            this.loading.delete(path);
            
            window.dispatchEvent(new CustomEvent('imageLoaded'));
            
        } catch (error) {
            console.error(`Error cargando imagen: ${path}`, error);
            this.loading.delete(path);
        }
    }
    
    clearCache() {
        this.cache.clear();
        this.loading.clear();
    }
}