// js/dataLoader.js

import { CONFIG } from './config.js';

/**
 * Carga los datos combinados para un nivel de grid específico
 */
export async function loadData(gridSize) {
    // Si estamos en modo fake data (para pruebas sin servidor)
    if (CONFIG.USE_FAKE_DATA) {
        return generateFakeData(gridSize);
    }

    const files = CONFIG.DATA_SOURCES[gridSize];

    if (!files || files.length === 0) {
        console.error(`No hay archivos configurados para el nivel ${gridSize}`);
        return {};
    }

    try {
        console.time(`Carga Nivel ${gridSize}`);
        
        // 1. Lanzar todas las peticiones en PARALELO
        const promises = files.map(file => fetch(file).then(response => {
            if (!response.ok) {
                throw new Error(`Error cargando ${file}: ${response.statusText}`);
            }
            return response.json();
        }));

        // 2. Esperar a que lleguen todas
        const parts = await Promise.all(promises);

        // 3. Fusionar las partes en un único objeto
        // Usamos Object.assign en un objeto vacío para fusionar
        // (Es más eficiente que ...spread para objetos muy grandes)
        const combinedData = Object.assign({}, ...parts);

        console.timeEnd(`Carga Nivel ${gridSize}`);
        console.log(`Nivel ${gridSize} cargado. Celdas totales: ${Object.keys(combinedData).length}`);

        return combinedData;

    } catch (error) {
        console.error(`Error crítico cargando datos del nivel ${gridSize}:`, error);
        return {};
    }
}

/**
 * Calcula el rango min/max de los counts para normalizar tamaños
 */
export function getCountRange(data) {
    let min = Infinity;
    let max = -Infinity;
    
    // Iteramos solo los valores para ser más rápidos
    const values = Object.values(data);
    
    if (values.length === 0) return { min: 1, max: 1 };

    for (const item of values) {
        if (item.count < min) min = item.count;
        if (item.count > max) max = item.count;
    }
    
    return { min, max };
}

// Generador de datos falsos (solo por si acaso necesitas testear sin JSONs)
function generateFakeData(gridSize) {
    const data = {};
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            if (Math.random() > 0.7) continue; 
            const key = `${x},${y}`;
            data[key] = {
                count: Math.floor(Math.random() * 1000),
                img: `https://picsum.photos/200?random=${x * gridSize + y}`,
                caption: `Celda ${x},${y} con datos de prueba`
            };
        }
    }
    return Promise.resolve(data);
}