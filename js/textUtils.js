// textUtils.js - Utilidades para texto

import { CONFIG } from './config.js';

/**
 * Trunca texto para que quepa en el ancho dado, max 2 líneas
 */
export function truncateText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                // Palabra muy larga, truncarla
                lines.push(truncateWord(ctx, word, maxWidth));
                currentLine = '';
            }
            
            if (lines.length >= CONFIG.MAX_TEXT_LINES) {
                break;
            }
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine && lines.length < CONFIG.MAX_TEXT_LINES) {
        lines.push(currentLine);
    }
    
    // Si hay más texto, añadir ... a la última línea
    if (lines.length === CONFIG.MAX_TEXT_LINES && words.length > lines.join(' ').split(' ').length) {
        const lastLine = lines[lines.length - 1];
        lines[lines.length - 1] = truncateWord(ctx, lastLine, maxWidth, '...');
    }
    
    return lines;
}

/**
 * Trunca una palabra añadiendo ... si es necesario
 */
function truncateWord(ctx, word, maxWidth, suffix = '...') {
    const suffixWidth = ctx.measureText(suffix).width;
    
    for (let i = word.length; i > 0; i--) {
        const truncated = word.substring(0, i) + suffix;
        const metrics = ctx.measureText(truncated);
        
        if (metrics.width <= maxWidth) {
            return truncated;
        }
    }
    
    return suffix;
}

/**
 * Dibuja texto centrado en múltiples líneas
 */
export function drawCenteredText(ctx, lines, x, y, width) {
    const lineHeight = CONFIG.FONT_SIZE + 2;
    const totalHeight = lines.length * lineHeight;
    let currentY = y - totalHeight / 2;
    
    ctx.fillStyle = CONFIG.TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (const line of lines) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
    }
}
