// gridRenderer.js - Renderizado del grid

import { CONFIG } from './config.js';
import { getCountRange } from './dataLoader.js';
import { truncateText, drawCenteredText } from './textUtils.js';

/**
 * Calcula las dimensiones del grid en el mundo
 * El grid tiene un tamaño FIJO en el mundo (1000 unidades)
 * y está centrado en (0,0)
 */
export function calculateGridDimensions(canvasWidth, canvasHeight) {
    // El grid tiene un tamaño fijo en unidades del mundo
    // Este tamaño determina el "zoom inicial" del grid
    const GRID_WORLD_SIZE = 1000;
    
    return {
        size: GRID_WORLD_SIZE,
        offsetX: -GRID_WORLD_SIZE / 2,
        offsetY: -GRID_WORLD_SIZE / 2
    };
}

/**
 * Calcula el tamaño de una celda basado en su count con ease-in-out
 */
export function calculateCellSize(count, minCount, maxCount, baseCellSize, gridSize) {
    const { MIN_CELL_SIZE_RATIO, LEVEL_THRESHOLDS } = CONFIG;
    
    if (maxCount === minCount) {
        return baseCellSize;
    }
    
    const thresholdPercent = LEVEL_THRESHOLDS[gridSize] || 0.05;
    const threshold = minCount + (maxCount - minCount) * thresholdPercent;
    
    if (count >= threshold) {
        return baseCellSize;
    }
    
    const normalized = (count - minCount) / (threshold - minCount);
    
    let eased;
    if (normalized < 0.5) {
        eased = 2 * normalized * normalized;
    } else {
        eased = 1 - 2 * Math.pow(1 - normalized, 2);
    }
    
    const sizeRatio = MIN_CELL_SIZE_RATIO + eased * (1 - MIN_CELL_SIZE_RATIO);
    
    return baseCellSize * sizeRatio;
}

/**
 * Calcula qué celdas son visibles en la pantalla actual
 * Buffer dinámico: aumenta con zoom alto para evitar que imágenes desaparezcan
 */
function getVisibleCells(camera, canvasWidth, canvasHeight, gridDims, baseCellSize, gridSize) {
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(canvasWidth, canvasHeight);
    
    const scale = camera.getScale();
    
    // Buffer dinámico según zoom
    let bufferMultiplier = 3;
    if (scale > 10) bufferMultiplier = 5;
    if (scale > 20) bufferMultiplier = 8;
    
    const bufferInWorldUnits = (baseCellSize * bufferMultiplier) / scale;
    
    const startX = Math.max(0, Math.floor((topLeft.x - gridDims.offsetX - bufferInWorldUnits) / baseCellSize));
    const endX = Math.min(gridSize - 1, Math.ceil((bottomRight.x - gridDims.offsetX + bufferInWorldUnits) / baseCellSize));
    const startY = Math.max(0, Math.floor((topLeft.y - gridDims.offsetY - bufferInWorldUnits) / baseCellSize));
    const endY = Math.min(gridSize - 1, Math.ceil((bottomRight.y - gridDims.offsetY + bufferInWorldUnits) / baseCellSize));
    
    return { startX, endX, startY, endY };
}

/**
 * Renderiza el grid completo
 */
export function renderGrid(ctx, canvas, data, gridSize, camera, imageManager) {
    // Limpiar canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Aplicar transformaciones de cámara
    camera.applyTransform(ctx);
    
    // Calcular dimensiones del grid
    const gridDims = calculateGridDimensions(canvas.width, canvas.height);
    const baseCellSize = gridDims.size / gridSize;
    
    // Obtener rango de counts para este nivel
    const { min: minCount, max: maxCount } = getCountRange(data);
    
    // Grosor de línea constante
    const lineWidth = 1 / camera.getScale();
    
    // Calcular celdas visibles
    const visibleCells = getVisibleCells(camera, canvas.width, canvas.height, gridDims, baseCellSize, gridSize);
    
    // Configurar fuente
    ctx.font = `${CONFIG.FONT_SIZE}px ${CONFIG.FONT_FAMILY}`;
    
    // Renderizar celdas visibles
    for (let cellX = visibleCells.startX; cellX <= visibleCells.endX; cellX++) {
        for (let cellY = visibleCells.startY; cellY <= visibleCells.endY; cellY++) {
            const key = `${cellX},${cellY}`;
            const cellData = data[key];
            
            if (!cellData) continue;
            
            // Calcular posición de la celda
            const x = gridDims.offsetX + cellX * baseCellSize;
            const y = gridDims.offsetY + cellY * baseCellSize;
            
            // Calcular tamaño proporcional
            const cellSize = calculateCellSize(
                cellData.count,
                minCount,
                maxCount,
                baseCellSize,
                gridSize
            );
            
            // Calcular tamaño en píxeles de pantalla
            const screenCellSize = cellSize * camera.getScale();
            
            // Centrar la celda en su espacio
            const centerOffset = (baseCellSize - cellSize) / 2;
            const finalX = x + centerOffset;
            const finalY = y + centerOffset;
            
            // Dibujar borde
            ctx.strokeStyle = CONFIG.CELL_BORDER_COLOR;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(finalX, finalY, cellSize, cellSize);
            
            // Solo renderizar contenido si es suficientemente grande
            if (screenCellSize < CONFIG.MIN_RENDER_SIZE) {
                continue;
            }
            
            // Obtener imagen
            const img = imageManager.getImage(cellData.img);
            
            if (!img) continue;
            
            // Decidir si mostrar texto
            const showText = screenCellSize >= 200;
            
            let availableWidth, availableHeight, imgX, imgY;
            
            if (showText) {
                // Celda grande: imagen arriba, texto abajo
                const lineHeight = CONFIG.FONT_SIZE + 2;
                const textHeight = lineHeight * CONFIG.MAX_TEXT_LINES + 4;
                
                availableWidth = cellSize;
                availableHeight = cellSize - textHeight;
                
                imgX = finalX;
                imgY = finalY;
            } else {
                // Celda pequeña: solo imagen
                availableWidth = cellSize;
                availableHeight = cellSize;
                
                imgX = finalX;
                imgY = finalY;
            }
            
            if (availableHeight > 0 && availableWidth > 0) {
                // Calcular escala para la imagen
                const scaleX = availableWidth / img.width;
                const scaleY = availableHeight / img.height;
                const scale = Math.min(scaleX, scaleY);
                
                const imgWidth = img.width * scale;
                const imgHeight = img.height * scale;
                
                // Centrar imagen
                const centerX = imgX + (availableWidth - imgWidth) / 2;
                const centerY = imgY + (availableHeight - imgHeight) / 2;
                
                ctx.drawImage(img, centerX, centerY, imgWidth, imgHeight);
                
                // Dibujar texto si corresponde
                if (showText) {
                    const textY = finalY + availableHeight + 2;
                    const textX = finalX + cellSize / 2;
                    const textWidth = cellSize - 4;
                    
                    const lines = truncateText(ctx, cellData.caption, textWidth);
                    drawCenteredText(ctx, lines, textX, textY, textWidth);
                }
            }
        }
    }
}

/**
 * Calcula el tamaño promedio de celda en píxeles de pantalla
 */
export function calculateAverageCellSize(canvas, gridSize, camera) {
    const gridDims = calculateGridDimensions(canvas.width, canvas.height);
    const baseCellSize = gridDims.size / gridSize;
    return baseCellSize * camera.getScale();
}
