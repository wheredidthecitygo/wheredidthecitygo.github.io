// js/textUtils.js

/**
 * Divide el texto en líneas.
 * - Respeta palabras completas si caben.
 * - Si una palabra es GIGANTE (más que el ancho), la parte a la fuerza.
 * - Añade "..." si se pasa de maxLines.
 */
export function truncateText(ctx, text, maxWidth, maxLines = 2) {
    if (!text) return [];

    const words = text.split(' ');
    const lines = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        
        // 1. ¿La palabra sola ya es más ancha que el máximo permitido?
        // Si es así, hay que partirla a la fuerza.
        if (ctx.measureText(word).width > maxWidth) {
            // Si teníamos algo en el buffer, lo guardamos antes de procesar la palabra gigante
            if (currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = "";
                if (lines.length >= maxLines) break; // Ya no cabe más
            }

            // Procesamos la palabra gigante letra por letra
            let subWord = "";
            for (let char of word) {
                if (ctx.measureText(subWord + char).width <= maxWidth) {
                    subWord += char;
                } else {
                    // La sub-palabra llenó la línea
                    lines.push(subWord);
                    subWord = char; // Empezamos nueva línea con la letra actual
                    if (lines.length >= maxLines) break;
                }
            }
            // Lo que sobre de la palabra gigante pasa a ser la línea actual
            if (lines.length < maxLines) {
                currentLine = subWord; // Nota: Aquí no añadimos espacio automáticamente
            }
            continue; // Pasamos a la siguiente palabra del array original
        }

        // 2. Comportamiento normal (palabra cabe entera)
        const testLine = currentLine.length > 0 ? currentLine + " " + word : word;
        const width = ctx.measureText(testLine).width;

        if (width < maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }

        if (lines.length >= maxLines) break;
    }

    // Añadir la última línea pendiente si hay hueco
    if (currentLine.length > 0 && lines.length < maxLines) {
        lines.push(currentLine);
    }

    // Lógica de "..." para la última línea si nos hemos pasado
    // (Simplificación: si el texto original sigue teniendo palabras que no hemos procesado
    // o si cortamos forzosamente, deberíamos indicarlo).
    // Para simplificar y asegurar rendimiento, aplicamos el "..." a la última línea válida
    // si vemos que se llenó el array de líneas.
    if (lines.length === maxLines) {
        const lastIndex = maxLines - 1;
        let lastLine = lines[lastIndex];
        
        // Verificamos si realmente cortamos texto (esto es una aproximación visual)
        // Simplemente nos aseguramos que la última línea no se salga con los puntos
        while (ctx.measureText(lastLine + "...").width > maxWidth && lastLine.length > 0) {
            lastLine = lastLine.slice(0, -1);
        }
        lines[lastIndex] = lastLine + (lastLine.length < lines[lastIndex].length ? "..." : "...");
    }

    return lines;
}

export function drawCenteredText(ctx, lines, x, startY, lineHeight) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    lines.forEach((line, index) => {
        ctx.fillText(line, x, startY + (index * lineHeight));
    });
}