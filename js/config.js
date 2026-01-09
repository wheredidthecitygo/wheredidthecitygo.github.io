// js/config.js

export const CONFIG = {
    DEFAULT_CITY: 'madrid', // <--- NUEVO
    
    GRID_SIZE: 64,
    MARGIN: 0,
    CELL_BORDER_COLOR: "#000000",
    BACKGROUND_COLOR: "#ffffff",
    MIN_CELL_SIZE_RATIO: 0.1,

    // Estructura anidada por ciudad
    DATA_SOURCES: {
        madrid: {
            64: ["data/madrid_64.json"],
            128: ["data/madrid_128_part1.json", "data/madrid_128_part2.json"],
            256: ["data/madrid_256_part1.json", "data/madrid_256_part2.json", "data/madrid_256_part3.json"],
        },
        arequipa: {
            64: ["data/arequipa_64.json"],
            128: ["data/arequipa_128_part1.json", "data/arequipa_128_part2.json"],
            256: ["data/arequipa_256_part1.json", "data/arequipa_256_part2.json", "data/arequipa_256_part3.json"],
        },
    },

    USE_FAKE_DATA: false,
    IMAGE_FIT: "cover",

    // Renderizado
    MIN_RENDER_SIZE: 10,
    LEVEL_TRANSITION_SIZE: 300,

    // Texto (Importante: debe coincidir con el CSS)
    FONT_FAMILY: "PPSupplyMono-Ultralight", 
    FONT_SIZE: 10,
    TEXT_COLOR: "#000000",
    TEXT_PADDING: 4,
    MAX_TEXT_LINES: 2,

    GRID_LEVELS: [64, 128, 256],

    LEVEL_THRESHOLDS: {
        64: 0.05,
        128: 0.05,
        256: 0.025,
    },

    DEBUG: false,
};