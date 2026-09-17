const express = require('express');
const router = express.Router();
const { formatMillisecondsToRaceTime } = require('../core/timeInterpreter');

const DATABASE = {};
const SESSION_BEST_LAPS = {};

const SERVER_STATE = {
    session_mode: "PRACTICE",
    track_name: "RED BULL",
    total_laps: 10,
    sc_status: "OFF"
};

// 📥 ПРИЕМНИК ТЕЛЕМЕТРИИ С MAC
router.post('/api/telemetry', (req, res) => {
    const data = req.body || {};
    if (!data || !data.pilot_name) {
        return res.status(400).json({ status: "error", message: "No data" });
    }

    const pilot = data.pilot_name;
    const currentLap = parseInt(data.current_lap) || 0;
    const pitState = parseInt(data.pit_state) || 2;
    const pos = data.position || "-";
    const rawLastLapMs = parseInt(data.raw_last_lap_ms) || parseInt(data.last_lap_ms) || 0;
    const rawBestLapMs = parseInt(data.best_lap_ms) || 0;

    if (rawBestLapMs > 0) {
        SESSION_BEST_LAPS[pilot] = rawBestLapMs;
    }

    DATABASE[pilot] = {
        position: pos,
        current_lap: currentLap,
        pit_state: pitState,
        last_lap_ms: rawLastLapMs,
        best_lap_ms: rawBestLapMs,
        last_update: Date.now() / 1000
    };

    res.json({ status: "success", sc_status: SERVER_STATE.sc_status });
});

// 📤 ВЫДАТЧИК ДАННЫХ НА ОВЕРЛЕЙ
router.get('/api/data', (req, res) => {
    const now = Date.now() / 1000;
    
    const active = {};
    let hasAnyLiveFinish = false; // Флаг: финишировал ли хоть кто-то в текущей сессии

    for (let p in DATABASE) {
        if (now - DATABASE[p].last_update < 6.0) {
            active[p] = DATABASE[p];
            // 🔥 ЖЕСТКАЯ ПРОВЕРКА: Если у живого пилота на трассе ЛК > 0, значит первый просчет пошел!
            if (DATABASE[p].best_lap_ms > 0) {
                hasAnyLiveFinish = true;
            }
        }
    }

    const sortedPilots = Object.entries(active).sort((a, b) => {
        const posA = parseInt(a.position) > 0 ? parseInt(a.position) : 99;
        const posB = parseInt(b.position) > 0 ? parseInt(b.position) : 99;
        return posA - posB;
    });

    const pilotsList = [];
    sortedPilots.forEach(([pName, pData]) => {
        let displayPosition = pData.position;
        if (displayPosition === 0 || displayPosition === -1 || displayPosition === "0" || displayPosition === "-1") {
            displayPosition = "-";
        }

        pilotsList.push({
            pilot_name: pName,
            position: displayPosition,
            current_lap: pData.current_lap,
            best_lap: formatMillisecondsToRaceTime(pData.best_lap_ms), 
            lap_time: formatMillisecondsToRaceTime(pData.last_lap_ms), 
            ui_mode: "DELTA"
        });
    });

    // Расчет абсолютного ЛК лобби
    let absoluteBestPilot = "";
    let absoluteBestTimeStr = "0:00.000";
    let showFlBanner = false;

    const validLaps = Object.entries(SESSION_BEST_LAPS).filter(([_, ms]) => ms > 0);
    
    // 🔥 СУДЕЙСКИЙ ФИКС: Плашка может включиться ТОЛЬКО если в лобби зафиксирован ХОТЯ БЫ ОДИН ЖИВОЙ ФИНИШ!
    if (validLaps.length > 0 && hasAnyLiveFinish) {
        validLaps.sort((a, b) => a - b);
        const [bestPilotName, bestMsValue] = validLaps;
        
        absoluteBestPilot = bestPilotName;
        absoluteBestTimeStr = formatMillisecondsToRaceTime(bestMsValue);
        showFlBanner = true;
    }

    res.json({
        sc_status: SERVER_STATE.sc_status,
        session_mode: SERVER_STATE.session_mode,
        track_name: SERVER_STATE.track_name,
        total_laps: SERVER_STATE.total_laps,
        pilots: pilotsList,
        fastest_lap: {
            show_banner: showFlBanner,
            pilot_name: absoluteBestPilot,
            time: absoluteBestTimeStr
        }
    });
});

module.exports = router;
