// js/main.js

import { CONFIG } from './config.js';
import { loadData, getCountRange } from './dataLoader.js'; 
import { renderGrid, calculateAverageCellSize, calculateGridDimensions, calculateCellSize } from './gridRenderer.js'; 
import { Camera } from './camera.js';
import { ImageManager } from './imageManager.js';

class GridVisualization {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.loader = document.getElementById('loader');
        this.ctx = this.canvas.getContext('2d');
        
        // --- ESTADO DE DATOS ---
        this.currentCity = CONFIG.DEFAULT_CITY; // Madrid por defecto
        this.allData = {};
        this.countRanges = {}; 
        this.currentGridSize = CONFIG.GRID_SIZE; // 64

        // --- SISTEMAS ---
        this.camera = new Camera();
        this.imageManager = new ImageManager();
        
        // --- INTERACCIÓN ---
        this.selectedKey = null; 
        this.hoveredKey = null;
        this.mouseDownPos = { x: 0, y: 0 };
        this.isClickCandidate = false;

        // --- RENDER LOOP ---
        this.renderScheduled = false;
        this.lastRenderTime = 0;
        this.MIN_RENDER_INTERVAL = 16;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupCitySelectors(); // <--- NUEVO: Listeners para las ciudades
        
        // Carga inicial
        this.startLoadingProcess();
    }

    // --- GESTIÓN DE CIUDADES ---

    setupCitySelectors() {
        const options = document.querySelectorAll('.city-option');
        options.forEach(opt => {
            opt.addEventListener('click', (e) => {
                const newCity = e.target.dataset.city;
                // Si es válida y no es la actual
                if (newCity && newCity !== this.currentCity && !e.target.classList.contains('disabled')) {
                    this.switchCity(newCity, e.target);
                }
            });
        });
    }

    async switchCity(newCity, domElement) {
        // 1. Actualizar UI (Negrita)
        document.querySelectorAll('.city-option').forEach(el => el.classList.remove('active'));
        if(domElement) domElement.classList.add('active');

        // 2. Limpiar Estado Interno
        this.currentCity = newCity;
        this.allData = {};       // Borrar datos viejos de memoria
        this.countRanges = {};   // Borrar rangos
        this.deselect();         // Limpiar selección UI
        this.hoveredKey = null;
        
        // Opcional: Limpiar cache de imágenes si queremos liberar RAM a lo bestia
        // this.imageManager.clearCache(); 

        // 3. Resetear Cámara (opcional, pero recomendado al cambiar de ciudad)
        this.resetCamera();

        // 4. Iniciar Carga
        await this.startLoadingProcess();
    }

    async startLoadingProcess() {
        // Mostrar Loader
        this.showLoader();

        try {
            // Cargar nivel inicial (64) de la ciudad actual
            const firstLevel = CONFIG.GRID_LEVELS[0];
            await this.loadLevel(firstLevel);
            
            // Ocultar loader y arrancar
            this.hideLoader();
            this.scheduleRender();
            
            // Cargar resto en background
            this.loadBackgroundLevels();
            
        } catch (error) {
            console.error("Error crítico:", error);
            document.querySelector('.loading-text').textContent = "ERROR AL CARGAR DATOS";
        }
    }

    showLoader() {
        this.loader.style.display = 'flex';
        // Forzamos reflow para que la transición funcione si venimos de display none
        this.loader.offsetHeight; 
        this.loader.classList.remove('hidden');
        this.canvas.classList.remove('visible');
    }

    hideLoader() {
        this.loader.classList.add('hidden');
        this.canvas.classList.add('visible');
        setTimeout(() => { this.loader.style.display = 'none'; }, 500);
    }
    
    // --- CARGA DE DATOS ---

    async loadBackgroundLevels() {
        const remainingLevels = CONFIG.GRID_LEVELS.slice(1);
        for (const level of remainingLevels) {
            // Verificar si seguimos en la misma ciudad antes de seguir cargando
            // (por si el usuario cambia rápido de ciudad)
            await this.loadLevel(level);
        }
    }
    
    async loadLevel(gridSize) {
        // Solo cargar si no lo tenemos ya
        if (!this.allData[gridSize]) {
            // Pasamos this.currentCity al dataLoader
            const data = await loadData(gridSize, this.currentCity);
            
            // Verificación de seguridad: ¿Seguimos necesitando estos datos?
            // Si el usuario cambió de ciudad mientras descargaba, data podría ser de la vieja
            // (Aunque loadData usa CONFIG, es mejor prevenir condiciones de carrera visuales)
            
            this.allData[gridSize] = data;
            this.countRanges[gridSize] = getCountRange(data);
        }
    }

    // ... (getCellAtPosition, handleInteraction, select, deselect, updateSidebar IGUAL QUE ANTES) ...
    // Solo pego las partes que cambian o son relevantes

    getCellAtPosition(clientX, clientY) {
        // ... (Tu código actual aquí) ...
        // Copia tu función getCellAtPosition del mensaje anterior
        // Es idéntica
        const gridDims = calculateGridDimensions(this.canvas.width, this.canvas.height);
        const baseCellSize = gridDims.size / this.currentGridSize;
        const worldPos = this.camera.screenToWorld(clientX, clientY);
        const cellX = Math.floor((worldPos.x - gridDims.offsetX) / baseCellSize);
        const cellY = Math.floor((worldPos.y - gridDims.offsetY) / baseCellSize);

        if (cellX >= 0 && cellX < this.currentGridSize && cellY >= 0 && cellY < this.currentGridSize) {
            const key = `${cellX},${cellY}`;
            const data = this.allData[this.currentGridSize];
            const cellData = data ? data[key] : null;

            if (cellData) {
                const range = this.countRanges[this.currentGridSize];
                // Si aún no ha cargado el rango (condición de carrera rara), usar default
                if(!range) return null; 

                const realCellSize = calculateCellSize(
                    cellData.count, 
                    range.min, 
                    range.max, 
                    baseCellSize, 
                    this.currentGridSize
                );

                const baseCellX = gridDims.offsetX + cellX * baseCellSize;
                const baseCellY = gridDims.offsetY + cellY * baseCellSize;
                const offset = (baseCellSize - realCellSize) / 2;
                
                const finalX = baseCellX + offset;
                const finalY = baseCellY + offset;

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

    // ... handleInteraction, select, deselect, updateSidebar ...
    // (Asegúrate de copiar esas funciones del mensaje anterior, no han cambiado)
    handleInteraction(clientX, clientY) {
        const hit = this.getCellAtPosition(clientX, clientY);
        if (hit) {
            if (this.selectedKey === hit.key) this.deselect();
            else this.select(hit.key, hit.data);
        } else {
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
        // ... (Tu código actual de updateSidebar) ...
        const menu = document.querySelector('.menu');
        const imgContainer = document.querySelector('.image-container');
        const placeholder = document.querySelector('.image-placeholder-text');
        const mainImage = document.querySelector('.main-image');
        const metadata = document.querySelector('.metadata');
        const examplesContainer = document.querySelector('.ejemplos');

        if (!data) {
            menu.classList.remove('active');
            imgContainer.classList.remove('filled');
            placeholder.style.display = 'block';
            mainImage.style.display = 'none';
            metadata.classList.remove('active');
            examplesContainer.innerHTML = '';
            return;
        }

        menu.classList.add('active');
        imgContainer.classList.add('filled');
        
        let imgSrc = data.img;
        if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('images/')) {
            imgSrc = `images/${this.currentCity}/${imgSrc}`;
        }

        placeholder.style.display = 'none';
        mainImage.style.display = 'block';
        mainImage.src = imgSrc;

        metadata.classList.add('active');
        metadata.scrollTop = 0; 

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
                
                // --- CAMBIO: CONSTRUCCIÓN DE RUTA EJEMPLOS CON CIUDAD ---
                let exSrc = ex.url;
                if (exSrc && !exSrc.startsWith('http') && !exSrc.startsWith('images/')) {
                    exSrc = `images/${this.currentCity}/${exSrc}`;
                }
                // --------------------------------------------------------

                div.innerHTML = `
                    <img class="img-ejemplo" src="${exSrc}" loading="lazy" alt="Example">
                    <p class="caption-ejemplo">${ex.caption || ''}</p>
                `;
                examplesContainer.appendChild(div);
            });
        }
    }

    // ... checkLevelTransition ... (Igual, pero asegurate de resetear a 64 al cambiar ciudad)
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
                this.deselect(); 
                return true;
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
        
        // Si no hemos reseteado la cámara (o es la primera vez), centrar
        if (this.camera.scale === 1 && this.camera.x === 0 && this.camera.y === 0) {
            this.resetCamera();
        }
    }

    resetCamera() {
        const rect = this.canvas.getBoundingClientRect();
        this.camera.x = rect.width / 2;
        this.camera.y = rect.height / 2;
        this.camera.scale = (Math.min(rect.width, rect.height) * 0.95) / 1000;
        this.currentGridSize = CONFIG.GRID_LEVELS[0]; // Resetear a nivel 64
    }
    
    // ... setupEventListeners, scheduleRender, render (IGUAL QUE ANTES) ...
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
        window.addEventListener('resize', () => { this.setupCanvas(); this.scheduleRender(); });
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDownPos = { x: e.clientX, y: e.clientY };
            this.isClickCandidate = true;
            this.camera.startDrag(e.clientX, e.clientY);
            this.canvas.style.cursor = 'grabbing';
        });
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.camera.drag(e.clientX, e.clientY)) {
                this.scheduleRender();
                return;
            }
            if (!this.camera.isDragging) {
                const hit = this.getCellAtPosition(e.clientX, e.clientY);
                this.canvas.style.cursor = hit ? 'pointer' : 'grab';
                const newHoverKey = hit ? hit.key : null;
                if (this.hoveredKey !== newHoverKey) {
                    this.hoveredKey = newHoverKey;
                    this.scheduleRender();
                }
            }
        });
        this.canvas.addEventListener('mouseup', (e) => {
            this.camera.endDrag();
            const hit = this.getCellAtPosition(e.clientX, e.clientY);
            this.canvas.style.cursor = hit ? 'pointer' : 'grab';
            if (this.isClickCandidate) {
                const dx = e.clientX - this.mouseDownPos.x;
                const dy = e.clientY - this.mouseDownPos.y;
                if (Math.sqrt(dx*dx + dy*dy) < 5) this.handleInteraction(e.clientX, e.clientY);
            }
            this.isClickCandidate = false;
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.camera.endDrag();
            this.canvas.style.cursor = 'grab';
            this.isClickCandidate = false;
            this.hoveredKey = null;
            this.scheduleRender();
        });
        this.canvas.addEventListener('wheel', async (e) => {
            e.preventDefault();
            this.hoveredKey = null;
            if (this.camera.zoom(e.deltaY, e.clientX, e.clientY)) {
                await this.checkLevelTransition();
                this.scheduleRender();
            }
        }, { passive: false });
        window.addEventListener('imageLoaded', () => { this.scheduleRender(); });
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
            this.selectedKey,
            this.hoveredKey,
            this.currentCity
        );
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GridVisualization();
});