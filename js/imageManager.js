// imageManager.js - Gestión de carga y cache de imágenes

export class ImageManager {
    constructor() {
        this.cache = new Map();
        this.loading = new Set();
    }
    
    /**
     * Obtiene una imagen (del cache o la carga)
     */
    getImage(path) {
        // Normalizar path: si no empieza con http ni images/, añadir images/
        let normalizedPath = path;
        if (!path.startsWith('http') && !path.startsWith('images/')) {
            normalizedPath = 'images/' + path;
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
    
    /**
     * Carga una imagen de forma asíncrona
     */
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
            
            // Notificar que hay que re-renderizar
            window.dispatchEvent(new CustomEvent('imageLoaded'));
            
        } catch (error) {
            console.error(`Error cargando imagen: ${path}`, error);
            this.loading.delete(path);
        }
    }
    
    /**
     * Limpia el cache
     */
    clearCache() {
        this.cache.clear();
    }
}
