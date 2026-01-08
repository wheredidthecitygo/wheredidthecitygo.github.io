// js/main.js

import { CONFIG } from './config.js';
import { loadData, getCountRange } from './dataLoader.js'; // Importamos getCountRange
import { renderGrid, calculateAverageCellSize, calculateGridDimensions, calculateCellSize } from './gridRenderer.js'; 
import { Camera } from './camera.js';
import { ImageManager } from './imageManager.js';

class GridVisualization {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.loader = document.getElementById('loader');
        this.ctx = this.canvas.getContext('2d');
        this.allData = {};
        
        // Cache de rangos por nivel (para calcular tamaños rápido en mousemove)
        this.countRanges = {}; 

        this.currentGridSize = CONFIG.GRID_SIZE;
        this.camera = new Camera();
        this.imageManager = new ImageManager();
        
        // Estados de interacción
        this.selectedKey = null; 
        this.hoveredKey = null; // Nueva propiedad para hover
        
        this.mouseDownPos = { x: 0, y: 0 };
        this.isClickCandidate = false;

        this.renderScheduled = false;
        this.lastRenderTime = 0;
        this.MIN_RENDER_INTERVAL = 16;
        
        this.init();
    }
    
    async init() {
        this.setupCanvas();
        this.setupEventListeners();
        
        try {
            const firstLevel = CONFIG.GRID_LEVELS[0];
            await this.loadLevel(firstLevel);
            this.hideLoader();
            this.scheduleRender();
            this.loadBackgroundLevels();
        } catch (error) {
            console.error("Error crítico en inicialización:", error);
            document.querySelector('.loading-text').textContent = "ERROR AL CARGAR DATOS";
        }
    }
    
    hideLoader() {
        this.loader.classList.add('hidden');
        this.canvas.classList.add('visible');
        setTimeout(() => { this.loader.style.display = 'none'; }, 500);
    }
    
    async loadBackgroundLevels() {
        const remainingLevels = CONFIG.GRID_LEVELS.slice(1);
        for (const level of remainingLevels) {
            await this.loadLevel(level);
        }
    }
    
    async loadLevel(gridSize) {
        if (!this.allData[gridSize]) {
            const data = await loadData(gridSize);
            this.allData[gridSize] = data;
            // Pre-calcular min/max para este nivel para no hacerlo en cada frame
            this.countRanges[gridSize] = getCountRange(data);
        }
    }

    /**
     * Calcula qué celda está bajo el ratón, considerando su tamaño real escalado.
     * Devuelve { key, data } o null si cae en el vacío.
     */
    getCellAtPosition(clientX, clientY) {
        const gridDims = calculateGridDimensions(this.canvas.width, this.canvas.height);
        const baseCellSize = gridDims.size / this.currentGridSize;
        
        // 1. Coordenadas del mundo
        const worldPos = this.camera.screenToWorld(clientX, clientY);
        
        // 2. En qué celda de la rejilla base cae
        const cellX = Math.floor((worldPos.x - gridDims.offsetX) / baseCellSize);
        const cellY = Math.floor((worldPos.y - gridDims.offsetY) / baseCellSize);

        // 3. Verificar límites de la rejilla
        if (cellX >= 0 && cellX < this.currentGridSize && cellY >= 0 && cellY < this.currentGridSize) {
            const key = `${cellX},${cellY}`;
            const data = this.allData[this.currentGridSize];
            const cellData = data ? data[key] : null;

            if (cellData) {
                // 4. HITBOX PRECISO: 
                // La celda puede ser más pequeña que el baseCellSize.
                // Tenemos que ver si el clic cae DENTRO del cuadrado escalado.
                
                const range = this.countRanges[this.currentGridSize];
                const realCellSize = calculateCellSize(
                    cellData.count, 
                    range.min, 
                    range.max, 
                    baseCellSize, 
                    this.currentGridSize
                );

                // Calcular posición real de inicio de la imagen (centrada en la celda base)
                const baseCellX = gridDims.offsetX + cellX * baseCellSize;
                const baseCellY = gridDims.offsetY + cellY * baseCellSize;
                const offset = (baseCellSize - realCellSize) / 2;
                
                const finalX = baseCellX + offset;
                const finalY = baseCellY + offset;

                // Comprobar colisión AABB (Axis-Aligned Bounding Box)
                if (worldPos.x >= finalX && 
                    worldPos.x <= finalX + realCellSize &&
                    worldPos.y >= finalY && 
                    worldPos.y <= finalY + realCellSize) {
                    
                    return { key, data: cellData };
                }
            }
        }
        return null;
    }

    handleInteraction(clientX, clientY) {
        const hit = this.getCellAtPosition(clientX, clientY);

        if (hit) {
            if (this.selectedKey === hit.key) {
                this.deselect();
            } else {
                this.select(hit.key, hit.data);
            }
        } else {
            // Clic en el vacío (entre celdas) -> Deseleccionar
            this.deselect();
        }
    }

    select(key, cellData) {
        this.selectedKey = key;
        this.updateSidebar(cellData);
        this.scheduleRender();
    }

    deselect() {
        if (this.selectedKey !== null) {
            this.selectedKey = null;
            this.updateSidebar(null);
            this.scheduleRender();
        }
    }

    updateSidebar(data) {
        const placeholder = document.querySelector('.image-placeholder-text');
        const mainImage = document.querySelector('.main-image');
        const metadata = document.querySelector('.metadata');
        const examplesContainer = document.querySelector('.ejemplos');

        if (!data) {
            placeholder.style.display = 'block';
            mainImage.style.display = 'none';
            metadata.classList.remove('active');
            examplesContainer.innerHTML = '';
            return;
        }

        // --- ARREGLO DE RUTA DE IMAGEN ---
        let imgSrc = data.img;
        if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('images/')) {
            imgSrc = 'images/' + imgSrc;
        }

        placeholder.style.display = 'none';
        mainImage.style.display = 'block';
        mainImage.src = imgSrc;

        metadata.classList.add('active');
        const link = document.querySelector('.meta-url');
        link.href = data.url;
        link.textContent = data.url;
        
        document.querySelector('.meta-caption').textContent = data.caption || '-';
        document.querySelector('.meta-count').textContent = data.count || '0';

        examplesContainer.innerHTML = '';
        
        if (data.examples && Array.isArray(data.examples)) {
            data.examples.forEach(ex => {
                const div = document.createElement('div');
                div.className = 'ejemplo';
                
                // Arreglo de ruta para ejemplos también, por seguridad
                let exSrc = ex.url;
                if (exSrc && !exSrc.startsWith('http') && !exSrc.startsWith('images/')) {
                    exSrc = 'images/' + exSrc;
                }

                div.innerHTML = `
                    <p class="caption-ejemplo">${ex.caption || ''}</p>
                    <img class="img-ejemplo" src="${exSrc}" loading="lazy" alt="Example">
                `;
                examplesContainer.appendChild(div);
            });
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
            if (this.allData[newLevel]) {
                this.currentGridSize = newLevel;
                this.deselect(); // Importante: deseleccionar al cambiar de nivel
                return true;
            } else {
                return false;
            }
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
        
        if (this.camera.scale === 1 && this.camera.x === 0 && this.camera.y === 0) {
            this.camera.x = rect.width / 2;
            this.camera.y = rect.height / 2;
            const targetSize = Math.min(rect.width, rect.height) * 0.95; 
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
            this.mouseDownPos = { x: e.clientX, y: e.clientY };
            this.isClickCandidate = true;
            
            this.camera.startDrag(e.clientX, e.clientY);
            this.canvas.style.cursor = 'grabbing';
        });
        
        // LOGICA DE HOVER Y CURSOR
        this.canvas.addEventListener('mousemove', (e) => {
            // 1. Gestión del arrastre
            if (this.camera.drag(e.clientX, e.clientY)) {
                this.scheduleRender();
                return; // Si estamos arrastrando, no calculamos hover
            }

            // 2. Gestión de Hover (solo si no se arrastra)
            if (!this.camera.isDragging) {
                const hit = this.getCellAtPosition(e.clientX, e.clientY);
                
                // Cambio de cursor
                this.canvas.style.cursor = hit ? 'pointer' : 'grab';

                // Repintado si cambia la celda bajo el ratón
                const newHoverKey = hit ? hit.key : null;
                if (this.hoveredKey !== newHoverKey) {
                    this.hoveredKey = newHoverKey;
                    this.scheduleRender();
                }
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.camera.endDrag();
            // Restaurar cursor basado en donde estemos
            const hit = this.getCellAtPosition(e.clientX, e.clientY);
            this.canvas.style.cursor = hit ? 'pointer' : 'grab';

            if (this.isClickCandidate) {
                const dx = e.clientX - this.mouseDownPos.x;
                const dy = e.clientY - this.mouseDownPos.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < 5) {
                    this.handleInteraction(e.clientX, e.clientY);
                }
            }
            this.isClickCandidate = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.camera.endDrag();
            this.canvas.style.cursor = 'grab';
            this.isClickCandidate = false;
            this.hoveredKey = null; // Limpiar hover al salir
            this.scheduleRender();
        });
        
        this.canvas.addEventListener('wheel', async (e) => {
            e.preventDefault();
            // Limpiamos hover al hacer zoom para evitar efectos raros
            this.hoveredKey = null; 
            
            if (this.camera.zoom(e.deltaY, e.clientX, e.clientY)) {
                await this.checkLevelTransition();
                this.scheduleRender();
            }
        }, { passive: false });
        
        window.addEventListener('imageLoaded', () => {
            this.scheduleRender();
        });
    }
    
    render() {
        const data = this.allData[this.currentGridSize];
        if (!data) return;
        
        const rect = this.canvas.getBoundingClientRect();
        renderGrid(
            this.ctx, 
            { width: rect.width, height: rect.height }, 
            data, 
            this.currentGridSize,
            this.camera,
            this.imageManager,
            this.selectedKey, // Pasamos selección
            this.hoveredKey   // Pasamos hover
        );
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GridVisualization();
});