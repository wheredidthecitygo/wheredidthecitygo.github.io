// main.js - Inicialización y coordinación

import { CONFIG } from './config.js';
import { loadData } from './dataLoader.js';
import { renderGrid, calculateAverageCellSize } from './gridRenderer.js';
import { Camera } from './camera.js';
import { ImageManager } from './imageManager.js';

class GridVisualization {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.allData = {};
        this.currentGridSize = CONFIG.GRID_SIZE;
        this.camera = new Camera();
        this.imageManager = new ImageManager();
        
        // Throttling de renders
        this.renderScheduled = false;
        this.lastRenderTime = 0;
        this.MIN_RENDER_INTERVAL = 16; // ~60fps
        
        this.init();
    }
    
    async init() {
        this.setupCanvas();
        this.setupEventListeners();
        
        // Cargar datos de todos los niveles
        for (const level of CONFIG.GRID_LEVELS) {
            await this.loadLevel(level);
        }
        
        this.scheduleRender();
    }
    
    async loadLevel(gridSize) {
        if (!this.allData[gridSize]) {
            this.allData[gridSize] = await loadData(gridSize);
        }
    }
    
    async checkLevelTransition() {
        const rect = this.canvas.getBoundingClientRect();
        const avgCellSize = calculateAverageCellSize(
            { width: rect.width, height: rect.height },
            this.currentGridSize,
            this.camera
        );
        
        let newLevel = this.currentGridSize;
        const currentIndex = CONFIG.GRID_LEVELS.indexOf(this.currentGridSize);
        
        if (avgCellSize > CONFIG.LEVEL_TRANSITION_SIZE && currentIndex < CONFIG.GRID_LEVELS.length - 1) {
            newLevel = CONFIG.GRID_LEVELS[currentIndex + 1];
        } else if (avgCellSize < CONFIG.LEVEL_TRANSITION_SIZE / 2 && currentIndex > 0) {
            newLevel = CONFIG.GRID_LEVELS[currentIndex - 1];
        }
        
        if (newLevel !== this.currentGridSize) {
            this.currentGridSize = newLevel;
            return true;
        }
        
        return false;
    }
    
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Solo centrar la cámara en la primera inicialización
        if (this.camera.scale === 1 && this.camera.x === 0 && this.camera.y === 0) {
            // Centrar la cámara
            this.camera.x = rect.width / 2;
            this.camera.y = rect.height / 2;
            
            // Calcular scale inicial para que el grid llene la pantalla
            // El grid tiene 1000 unidades de tamaño, queremos que ocupe ~el canvas
            const targetSize = Math.min(rect.width, rect.height) * 0.95; // 95% del canvas
            this.camera.scale = targetSize / 1000;
        }
    }
    
    scheduleRender() {
        if (this.renderScheduled) return;
        
        this.renderScheduled = true;
        
        requestAnimationFrame(() => {
            const now = performance.now();
            const timeSinceLastRender = now - this.lastRenderTime;
            
            if (timeSinceLastRender >= this.MIN_RENDER_INTERVAL) {
                this.render();
                this.lastRenderTime = now;
                this.renderScheduled = false;
            } else {
                setTimeout(() => {
                    this.render();
                    this.lastRenderTime = performance.now();
                    this.renderScheduled = false;
                }, this.MIN_RENDER_INTERVAL - timeSinceLastRender);
            }
        });
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.scheduleRender();
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.camera.startDrag(e.clientX, e.clientY);
            this.canvas.style.cursor = 'grabbing';
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.camera.drag(e.clientX, e.clientY)) {
                this.scheduleRender();
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.camera.endDrag();
            this.canvas.style.cursor = 'grab';
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.camera.endDrag();
            this.canvas.style.cursor = 'grab';
        });
        
        this.canvas.addEventListener('wheel', async (e) => {
            e.preventDefault();
            
            if (this.camera.zoom(e.deltaY, e.clientX, e.clientY)) {
                await this.checkLevelTransition();
                this.scheduleRender();
            }
        }, { passive: false });
        
        window.addEventListener('imageLoaded', () => {
            this.scheduleRender();
        });
        
        this.canvas.style.cursor = 'grab';
    }
    
    render() {
        const data = this.allData[this.currentGridSize];
        
        if (!data) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        renderGrid(
            this.ctx, 
            { width: rect.width, height: rect.height }, 
            data, 
            this.currentGridSize,
            this.camera,
            this.imageManager
        );
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GridVisualization();
});
