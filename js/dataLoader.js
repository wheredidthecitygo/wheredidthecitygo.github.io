// dataLoader.js - Carga de datos

import { CONFIG } from './config.js';

/**
 * Genera datos falsos para pruebas
 */
export function generateFakeData(gridSize) {
    const data = {};
    
    // Generar datos aleatorios para algunas celdas
    const numCells = Math.floor(gridSize * gridSize * 0.6); // ~60% de celdas con datos
    
    for (let i = 0; i < numCells; i++) {
        const x = Math.floor(Math.random() * gridSize);
        const y = Math.floor(Math.random() * gridSize);
        const key = `${x},${y}`;
        
        if (!data[key]) {
            data[key] = {
                count: Math.floor(Math.random() * 10000) + 100,
                img: `images/${gridSize}/${x}_${y}.webp`,
                caption: `Imagen de prueba en celda ${x},${y} con datos aleatorios`
            };
        }
    }
    
    return data;
}

/**
 * Carga datos del archivo JSON
 */
export async function loadData(gridSize) {
    if (CONFIG.USE_FAKE_DATA) {
        console.log('Usando datos falsos para pruebas');
        return generateFakeData(gridSize);
    }
    
    try {
        const response = await fetch(CONFIG.DATA_FILE);
        if (!response.ok) {
            throw new Error(`Error cargando datos: ${response.status}`);
        }
        
        const json = await response.json();
        console.log(`JSON cargado, estructura:`, Object.keys(json));
        console.log(`Niveles disponibles:`, Object.keys(json.levels || {}));
        
        const levelData = json.levels[gridSize.toString()] || {};
        console.log(`Datos para nivel ${gridSize}:`, Object.keys(levelData).length, 'celdas');
        
        return levelData;
    } catch (error) {
        console.error('Error al cargar datos:', error);
        console.log('Usando datos falsos como fallback');
        return generateFakeData(gridSize);
    }
}

/**
 * Encuentra el valor máximo y mínimo de count en los datos
 */
export function getCountRange(data) {
    const counts = Object.values(data).map(cell => cell.count);
    
    if (counts.length === 0) {
        return { min: 0, max: 1 };
    }
    
    return {
        min: Math.min(...counts),
        max: Math.max(...counts)
    };
}
