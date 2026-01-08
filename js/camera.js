// camera.js - Manejo de pan y zoom

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.minScale = 0.5;
        this.maxScale = 200;
    }
    
    /**
     * Aplica las transformaciones de la cámara al contexto
     */
    applyTransform(ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
    }
    
    /**
     * Inicia el arrastre
     */
    startDrag(mouseX, mouseY) {
        this.isDragging = true;
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
    }
    
    /**
     * Mueve la cámara durante el arrastre
     */
    drag(mouseX, mouseY) {
        if (!this.isDragging) return false;
        
        const dx = mouseX - this.lastMouseX;
        const dy = mouseY - this.lastMouseY;
        
        this.x += dx;
        this.y += dy;
        
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
        
        return true;
    }
    
    /**
     * Termina el arrastre
     */
    endDrag() {
        this.isDragging = false;
    }
    
    /**
     * Aplica zoom centrado en un punto
     */
    zoom(deltaY, mouseX, mouseY) {
        const zoomIntensity = 0.001;
        const zoom = Math.exp(-deltaY * zoomIntensity);
        
        const newScale = this.scale * zoom;
        
        // Limitar el zoom
        if (newScale < this.minScale || newScale > this.maxScale) {
            return false;
        }
        
        // Zoom centrado en la posición del mouse
        // Convertir posición del mouse al espacio del mundo
        const worldX = (mouseX - this.x) / this.scale;
        const worldY = (mouseY - this.y) / this.scale;
        
        // Aplicar nuevo scale
        this.scale = newScale;
        
        // Ajustar posición para mantener el punto bajo el mouse
        this.x = mouseX - worldX * this.scale;
        this.y = mouseY - worldY * this.scale;
        
        return true;
    }
    
    /**
     * Convierte coordenadas de pantalla a coordenadas del mundo
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.x) / this.scale,
            y: (screenY - this.y) / this.scale
        };
    }
    
    /**
     * Obtiene el scale actual (útil para mantener grosor de línea constante)
     */
    getScale() {
        return this.scale;
    }
}
