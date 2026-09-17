/**
 * 🏎️ SRO GT7 RACE ENGINE — PIT ANIMATION LOCK (ANTI-CHEATING FILTER)
 * Защищает оверлей от ложного сброса PIT во время анимации игры.
 * Удерживает PIT, если ложный триггер трека длится меньше 3 секунд.
 * После реального выезда держит OUT ровно 10 секунд.
 */

// Оперативная память состояний для каждого пилота в лобби
const pitMemory = {};

function processServerPitStates(pilotName, pitState) {
    const now = Date.now(); // Текущее время в миллисекундах

    // Инициализируем кэш пилота
    if (!pitMemory[pilotName]) {
        pitMemory[pilotName] = {
            currentState: "TRACK",    // "TRACK", "PIT", "TRACK_PENDING", "OUT"
            trackTriggerTime: 0,      // Когда игра во время пита прислала двойку (TRACK)
            exitTime: 0               // Когда пилот РЕАЛЬНО уехал на трассу
        };
    }

    const mem = pitMemory[pilotName];

    // 🔴 ПИЛОТ В БОКСАХ / НА ПИТ-ЛЕЙНЕ (Игра прислала статус 1 или 3)
    if (pitState === 1 || pitState === 3) {
        // Намертво включаем или удерживаем статус PIT
        mem.currentState = "PIT";
        mem.trackTriggerTime = 0; // Сбрасываем любые таймеры ложного выезда
        return { ui_mode: "PIT", badge_text: "PIT" };
    }

    // 🟢 ИГРА ПРИСЛАЛА ТРИГГЕР ТРЕКА (Статус 2)
    if (pitState === 2) {
        
        // Обычная езда по трассе (если пилот и так был на трассе)
        if (mem.currentState === "TRACK") {
            return { ui_mode: "DELTA", badge_text: "" };
        }

        // 🔥 ВОТ ОН, ЗАМОК АНИМАЦИИ: Игра шлет трек, но пилот до этого был в PIT!
        if (mem.currentState === "PIT") {
            mem.currentState = "TRACK_PENDING";
            mem.trackTriggerTime = now; // Начинаем отсчет 3-х секунд проверки стабильности
        }

        // Пока мы находимся в фазе проверки ложного выезда во время анимации
        if (mem.currentState === "TRACK_PENDING") {
            const trackDuration = (now - mem.trackTriggerTime) / 1000;

            if (trackDuration < 3.0) {
                // 🛑 МЕНЬШЕ 3 СЕКУНД: Это ложный триггер игры во время анимации! 
                // Визуально статус НЕ меняем, оставляем плашку PIT гореть на экране!
                return { ui_mode: "PIT", badge_text: "PIT" };
            } else {
                // 🔥 БОЛЬШЕ 3 СЕКУНД: Выезд подтвержден, машина реально на асфальте!
                mem.currentState = "OUT";
                mem.exitTime = now; // Фиксируем точную миллисекунду реального выезда
            }
        }

        // Режим удержания ярко-зеленого статуса OUT после подтвержденного выезда
        if (mem.currentState === "OUT") {
            const timePassed = (now - mem.exitTime) / 1000;

            if (timePassed < 10.0) {
                // 10 секунд еще не прошло — жестко держим бэдж OUT на экране
                return { ui_mode: "OUT", badge_text: "OUT" };
            } else {
                // 10 секунд вышло — плавно гасим плашку, возвращаем чистый режим трека
                mem.currentState = "TRACK";
                mem.exitTime = 0;
                mem.trackTriggerTime = 0;
                return { ui_mode: "DELTA", badge_text: "" };
            }
        }
    }

    return { ui_mode: "DELTA", badge_text: "" };
}

module.exports = { processServerPitStates };
