// js/config.js

export const CONFIG = {
    GRID_SIZE: 64,
    MARGIN: 0,
    CELL_BORDER_COLOR: '#000000',
    BACKGROUND_COLOR: '#ffffff',
    MIN_CELL_SIZE_RATIO: 0.1, 
    
    // YA NO USAMOS DATA_FILE ÚNICO
    // Definimos la estructura de archivos por nivel
    DATA_SOURCES: {
        64: ['data/grid_64.json'],
        128: ['data/grid_128_part1.json', 'data/grid_128_part2.json'],
        256: ['data/grid_256_part1.json', 'data/grid_256_part2.json', 'data/grid_256_part3.json']
    },
    
    USE_FAKE_DATA: false, 
    IMAGE_FIT: 'cover', 
    
    // Renderizado
    MIN_RENDER_SIZE: 10, 
    LEVEL_TRANSITION_SIZE: 300, 
    
    // Texto
    FONT_FAMILY: 'monospace',
    FONT_SIZE: 10,
    TEXT_COLOR: '#000000',
    TEXT_PADDING: 4,
    MAX_TEXT_LINES: 2,
    
    // Niveles de grid
    GRID_LEVELS: [64, 128, 256],
    
    // Umbrales
    LEVEL_THRESHOLDS: {
        64: 0.05,
        128: 0.05,
        256: 0.025
    },
    
    DEBUG: false 
};