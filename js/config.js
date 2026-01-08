// config.js - Configuración general

export const CONFIG = {
    GRID_SIZE: 64,
    MARGIN: 0,
    CELL_BORDER_COLOR: '#000000',
    BACKGROUND_COLOR: '#ffffff',
    MIN_CELL_SIZE_RATIO: 0.1, 
    DATA_FILE: 'grid_data.json',
    USE_FAKE_DATA: false, 
    
    // Comportamiento de la imagen
    // 'cover': La imagen llena la celda (recortando sobrantes)
    // 'contain': La imagen se ve entera (con espacios blancos si no encaja)
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
    
    // Debug
    DEBUG: false 
};