// js/gridRenderer.js

import { CONFIG } from './config.js';
import { getCountRange } from './dataLoader.js';
import { truncateText, drawCenteredText } from './textUtils.js';

export function calculateGridDimensions(canvasWidth, canvasHeight) {
    const GRID_WORLD_SIZE = 1000;
    return { size: GRID_WORLD_SIZE, offsetX: -GRID_WORLD_SIZE / 2, offsetY: -GRID_WORLD_SIZE / 2 };
}

export function calculateCellSize(count, minCount, maxCount, baseCellSize, gridSize) {
    const { MIN_CELL_SIZE_RATIO, LEVEL_THRESHOLDS } = CONFIG;
    if (maxCount === minCount) return baseCellSize;
    const thresholdPercent = LEVEL_THRESHOLDS[gridSize] || 0.05;
    const threshold = minCount + (maxCount - minCount) * thresholdPercent;
    if (count >= threshold) return baseCellSize;
    const normalized = (count - minCount) / (threshold - minCount);
    let eased = normalized < 0.5 ? 2 * normalized * normalized : 1 - 2 * Math.pow(1 - normalized, 2);
    return baseCellSize * (MIN_CELL_SIZE_RATIO + eased * (1 - MIN_CELL_SIZE_RATIO));
}

function getVisibleCells(camera, canvasWidth, canvasHeight, gridDims, baseCellSize, gridSize) {
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(canvasWidth, canvasHeight);
    const scale = camera.getScale();
    let bufferMultiplier = scale > 20 ? 8 : (scale > 10 ? 5 : 3);
    const bufferInWorldUnits = (baseCellSize * bufferMultiplier) / scale;
    const startX = Math.max(0, Math.floor((topLeft.x - gridDims.offsetX - bufferInWorldUnits) / baseCellSize));
    const endX = Math.min(gridSize - 1, Math.ceil((bottomRight.x - gridDims.offsetX + bufferInWorldUnits) / baseCellSize));
    const startY = Math.max(0, Math.floor((topLeft.y - gridDims.offsetY - bufferInWorldUnits) / baseCellSize));
    const endY = Math.min(gridSize - 1, Math.ceil((bottomRight.y - gridDims.offsetY + bufferInWorldUnits) / baseCellSize));
    return { startX, endX, startY, endY };
}

// AÑADIDO: hoveredKey como argumento final
export function renderGrid(ctx, canvas, data, gridSize, camera, imageManager, selectedKey = null, hoveredKey = null, currentCity = 'madrid') {    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const currentScale = camera.getScale();
    const camX = camera.x;
    const camY = camera.y;
    const gridDims = calculateGridDimensions(canvas.width, canvas.height);
    const baseCellSize = gridDims.size / gridSize;
    const { min: minCount, max: maxCount } = getCountRange(data);
    const lineWidth = 1 / currentScale;

    const visibleCells = getVisibleCells(camera, canvas.width, canvas.height, gridDims, baseCellSize, gridSize);
    
    for (let cellX = visibleCells.startX; cellX <= visibleCells.endX; cellX++) {
        for (let cellY = visibleCells.startY; cellY <= visibleCells.endY; cellY++) {
            const key = `${cellX},${cellY}`;
            const cellData = data[key];
            if (!cellData) continue;
            
            // ESTADOS
            const isSelected = (key === selectedKey);
            const isHovered = (key === hoveredKey);

            const worldX = gridDims.offsetX + cellX * baseCellSize;
            const worldY = gridDims.offsetY + cellY * baseCellSize;
            const cellSizeWorld = calculateCellSize(cellData.count, minCount, maxCount, baseCellSize, gridSize);
            const centerOffset = (baseCellSize - cellSizeWorld) / 2;
            const finalX_World = worldX + centerOffset;
            const finalY_World = worldY + centerOffset;
            const screenCellSize = cellSizeWorld * currentScale;

            // --- FASE 1: DIBUJO ---
            ctx.setTransform(currentScale, 0, 0, currentScale, camX, camY);
            
            // Fondo blanco detrás de la imagen (por si es transparente o PNG)
            ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
            ctx.fillRect(finalX_World, finalY_World, cellSizeWorld, cellSizeWorld);
            
            // Imagen
            if (screenCellSize >= CONFIG.MIN_RENDER_SIZE) {
                const img = imageManager.getImage(cellData.img, currentCity);
                if (img) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(finalX_World, finalY_World, cellSizeWorld, cellSizeWorld);
                    ctx.clip(); 
                    const scaleX = cellSizeWorld / img.width;
                    const scaleY = cellSizeWorld / img.height;
                    const scale = (CONFIG.IMAGE_FIT === 'contain') ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
                    const imgWidth = img.width * scale;
                    const imgHeight = img.height * scale;
                    const centerX = finalX_World + (cellSizeWorld - imgWidth) / 2;
                    const centerY = finalY_World + (cellSizeWorld - imgHeight) / 2;
                    ctx.drawImage(img, centerX, centerY, imgWidth, imgHeight);
                    ctx.restore();
                }
            }

            // Borde y Efectos de Estado
            ctx.strokeStyle = CONFIG.CELL_BORDER_COLOR;
            
            if (isSelected) {
                // Seleccionado: Muy grueso
                ctx.lineWidth = lineWidth * 3;
            } else if (isHovered) {
                // Hover: Un poco más grueso
                ctx.lineWidth = lineWidth * 2;
            } else {
                // Normal
                ctx.lineWidth = lineWidth;
            }
            
            ctx.strokeRect(finalX_World, finalY_World, cellSizeWorld, cellSizeWorld);

            // --- FASE 2: TEXTO ---
            if (screenCellSize >= 200 && cellData.caption) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                const screenX = (finalX_World * currentScale) + camX;
                const screenY = (finalY_World * currentScale) + camY;
                const fontSize = CONFIG.FONT_SIZE;
                const padding = CONFIG.TEXT_PADDING;
                ctx.font = `${fontSize}px ${CONFIG.FONT_FAMILY}`;
                const maxTextWidth = screenCellSize - (padding * 2);
                const lines = truncateText(ctx, cellData.caption, maxTextWidth, CONFIG.MAX_TEXT_LINES || 2);
                
                if (lines.length > 0) {
                    const lineHeight = fontSize * 1.3;
                    const blockHeight = (lines.length * lineHeight) + (padding * 2);
                    const blockY = screenY + screenCellSize - blockHeight;
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(screenX, blockY, screenCellSize, blockHeight);
                    ctx.fillStyle = CONFIG.TEXT_COLOR;
                    drawCenteredText(ctx, lines, screenX + screenCellSize / 2, blockY + padding, lineHeight);
                }
            }
        }
    }
}

export function calculateAverageCellSize(canvas, gridSize, camera) {
    const gridDims = calculateGridDimensions(canvas.width, canvas.height);
    const baseCellSize = gridDims.size / gridSize;
    return baseCellSize * camera.getScale();
}