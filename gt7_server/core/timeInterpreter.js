/**
 * ГОНОЧНЫЙ ИНТЕРПРЕТАТОР ВРЕМЕНИ SRO
 * Конвертирует сырые миллисекунды в киберспортивный текстовый формат M:SS.ссс
 */
function formatMillisecondsToRaceTime(ms) {
    const totalMs = parseInt(ms) || 0;
    
    if (totalMs > 0) {
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;
        
        // Дописываем ведущие нули, чтобы время не прыгало (:02d и .03d)
        const secStr = seconds.toString().padStart(2, '0');
        const msStr = milliseconds.toString().padStart(3, '0');
        
        return `${minutes}:${secStr}.${msStr}`;
    }
    
    return "0:00.000";
}

// Экспортируем функцию наружу по канонам CommonJS
module.exports = { formatMillisecondsToRaceTime };
