/**
 * 🏎️ SRO GT7 RACE ENGINE — DOUBLE LOCK EDITION
 * 1. Включает PIT после 3 секунд стабильного нахождения в боксах.
 * 2. ДЕМПФЕР АНИМАЦИИ: Удерживает PIT, если ложный триггер трека (2) длится меньше 3 секунд.
 * 3. Удерживает ярко-зеленый статус OUT ровно 5 секунд после РЕАЛЬНОГО выезда.
 */

const pitMemory = {};

function processServerPitStates(pilotName, pitState) {
    const now = Date.now(); // Текущее время в миллисекундах

    // Инициализируем кэш пилота при первом заезде
    if (!pitMemory[pilotName]) {
        pitMemory[pilotName] = {
            currentState: "TRACK",    // "TRACK", "PIT_PENDING", "PIT", "TRACK_PENDING", "OUT"
            pitEntryTime: 0,          // Когда игра впервые прислала 1 или 3
            trackTriggerTime: 0,      // Когда игра прислала 2 во время анимации в питах
            exitTime: 0               // Когда пилот реально уехал на трассу (2)
        };
    }

    const mem = pitMemory[pilotName];

    // 🔴 ЗОНА ПИТ-ЛЕЙНА (Игра прислала статус 1 или 3)
    if (pitState === 1 || pitState === 3) {
        
        // Если пилот ехал по трассе или был в фазе OUT и пересёк черту пит-лейна
        if (mem.currentState === "TRACK" || mem.currentState === "OUT") {
            mem.currentState = "PIT_PENDING";
            mem.pitEntryTime = now; // Фиксируем точное время запроса на заезд
        }

        // Если пилот в режиме ожидания подтверждения заезда (3-секундный замок на въезде)
        if (mem.currentState === "PIT_PENDING") {
            const pendingDuration = (now - mem.pitEntryTime) / 1000;

            if (pendingDuration >= 3.0) {
                mem.currentState = "PIT";
            } else {
                return { ui_mode: "DELTA", badge_text: "" };
            }
        }

        // Если заезд подтвержден — намертво фиксируем красный бэдж PIT и сбрасываем ложные таймеры
        if (mem.currentState === "PIT" || mem.currentState === "TRACK_PENDING") {
            mem.currentState = "PIT";
            mem.trackTriggerTime = 0;
            return { ui_mode: "PIT", badge_text: "PIT" };
        }
    }

    // 🟢 ВЫЕЗД НА ТРАССУ (Игра прислала статус 2)
    if (pitState === 2) {
        
        // Если игра шлёт двойку, пока мы ждали 3 секунды на въезде — сбрасываем ложный дребезг флага
        if (mem.currentState === "PIT_PENDING") {
            mem.currentState = "TRACK";
            mem.pitEntryTime = 0;
            return { ui_mode: "DELTA", badge_text: "" };
        }

        // 🔥 ИСПРАВЛЕНИЕ ПРОСКОКА АНИМАЦИИ: 
        // Если игра прислала трек (2), но пилот до этого сидел в чистом статусе PIT — 
        // мы НЕ включаем OUT сразу! Мы включаем режим проверки ложного выезда TRACK_PENDING!
        if (mem.currentState === "PIT") {
            mem.currentState = "TRACK_PENDING";
            mem.trackTriggerTime = now; // Начинаем отсчет 3-х секунд удержания PIT
        }

        // Пока мы находимся внутри 3-секундного демпфера анимации
        if (mem.currentState === "TRACK_PENDING") {
            const trackDuration = (now - mem.trackTriggerTime) / 1000;

            if (trackDuration < 3.0) {
                // 🛑 МЕНЬШЕ 3 СЕКУНД: Это тот самый баг ракурсов игры на анимации подъезда!
                // Жёстко удерживаем плашку PIT и не даем ей переключиться на OUT или TRACK!
                return { ui_mode: "PIT", badge_text: "PIT" };
            } else {
                // 🔥 БОЛЬШЕ 3 СЕКУНД: Сигнал трека стабилен, пилот РЕАЛЬНО покинул боксы!
                mem.currentState = "OUT";
                mem.exitTime = now; // Фиксируем точную миллисекунду реального выезда
            }
        }

        // Режим удержания ярко-зеленого статуса OUT ровно 5 секунд после реального выезда
        if (mem.currentState === "OUT") {
            const timePassed = (now - mem.exitTime) / 1000;

            if (timePassed < 5.0) {
                return { ui_mode: "OUT", badge_text: "OUT" };
            } else {
                // 5 секунд вышло — плавно гасим плашку, возвращаем чистый режим
                mem.currentState = "TRACK";
                mem.exitTime = 0;
                mem.pitEntryTime = 0;
                mem.trackTriggerTime = 0;
                return { ui_mode: "DELTA", badge_text: "" };
            }
        }
    }

    return { ui_mode: "DELTA", badge_text: "" };
}

module.exports = { processServerPitStates };
