// config.js - Configuración general

export const CONFIG = {
    GRID_SIZE: 64,
    MARGIN: 0,
    CELL_BORDER_COLOR: '#000000',
    BACKGROUND_COLOR: '#ffffff',
    MIN_CELL_SIZE_RATIO: 0.1, // Tamaño mínimo de celda (10% del tamaño normal)
    DATA_FILE: 'grid_data.json',
    USE_FAKE_DATA: false, // Cambiar a false cuando tengamos datos reales
    
    // Renderizado
    MIN_RENDER_SIZE: 10, // No renderizar imágenes/texto en celdas más pequeñas de 20px
    LEVEL_TRANSITION_SIZE: 300, // Cambiar de nivel cuando las celdas superan 300px
    
    // Texto
    FONT_FAMILY: 'monospace',
    FONT_SIZE: 10,
    TEXT_COLOR: '#000000',
    TEXT_PADDING: 4,
    MAX_TEXT_LINES: 2,
    
    // Niveles de grid
    GRID_LEVELS: [64, 128, 256],
    
    // Umbrales de tamaño por nivel (qué % del máximo count = tamaño completo)
    LEVEL_THRESHOLDS: {
        64: 0.05,   // 5% del máximo = tamaño completo
        128: 0.05,  // 5% del máximo = tamaño completo
        256: 0.025  // 2.5% del máximo = tamaño completo
    },
    
    // Debug
    DEBUG: false // Activa logs de rendimiento
};
