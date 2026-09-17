const express = require('express');
const router = express.Router();
const { formatMillisecondsToRaceTime } = require('../core/timeInterpreter');

// 🔥 ИМПОРТИРУЕМ МОДУЛЬ ПИТ-СТОПОВ
const { processServerPitStates } = require('../core/raceEngine');

const DATABASE = {};
const SESSION_BEST_LAPS = {};

const SERVER_STATE = {
    session_mode: "PRACTICE",
    track_name: "RED BULL",
    total_laps: 10,
    sc_status: "OFF"
};

// 📥 ПРИЕМНИК ПАКЕТОВ С MAC
router.post('/api/telemetry', (req, res) => {
    const data = req.body || {};
    if (!data || !data.pilot_name) {
        return res.status(400).json({ status: "error", message: "No data" });
    }

    const pilot = data.pilot_name;
    const rawLastLapMs = parseInt(data.raw_last_lap_ms) || parseInt(data.last_lap_ms) || 0;
    const rawBestLapMs = parseInt(data.best_lap_ms) || 0;

    DATABASE[pilot] = {
        position: data.position || "-",
        current_lap: data.current_lap || 0,
        pit_state: parseInt(data.pit_state) || 2, // Намертво фиксируем числом
        last_lap_ms: rawLastLapMs, 
        best_lap_ms: rawBestLapMs, 
        last_update: Date.now() / 1000
    };

    res.json({ status: "success", sc_status: SERVER_STATE.sc_status });
});

// 📤 ВЫДАТЧИК ДАННЫХ ДЛЯ JS ОВЕРЛЕЯ
router.get('/api/data', (req, res) => {
    const now = Date.now() / 1000;
    
    const active = {};
    for (let p in DATABASE) {
        if (now - DATABASE[p].last_update < 6.0) {
            active[p] = DATABASE[p];
        }
    }

    const sortedPilots = Object.entries(active).sort((a, b) => {
        const posA = parseInt(a.position) > 0 ? parseInt(a.position) : 99;
        const posB = parseInt(b.position) > 0 ? parseInt(b.position) : 99;
        return posA - posB;
    });

    const pilotsList = [];
    let absoluteBestPilot = "";
    let absoluteBestMs = Infinity;

    sortedPilots.slice(0, 16).forEach(([pName, pData]) => {
        let displayPosition = pData.position;
        const numericPos = parseInt(displayPosition);

        if (isNaN(numericPos) || numericPos <= 0) {
            displayPosition = "DNF";
        } else {
            displayPosition = numericPos.toString();
        }

        if (pData.best_lap_ms > 0 && pData.best_lap_ms < absoluteBestMs) {
            absoluteBestMs = pData.best_lap_ms;
            absoluteBestPilot = pName;
        }

        // 🔥 ПРОГОНЯЕМ ПИЛОТА ЧЕРЕЗ НАШ СУДЕЙСКИЙ ДВИЖОК СТАТУСОВ PIT / OUT
        const pitCalculated = processServerPitStates(pName, pData.pit_state);

        pilotsList.push({
            pilot_name: pName,
            position: displayPosition,
            current_lap: pData.current_lap,
            best_lap: formatMillisecondsToRaceTime(pData.best_lap_ms), 
            lap_time: formatMillisecondsToRaceTime(pData.last_lap_ms), 
            
            // Отдаем на фронтенд рассчитанные движком бэджи
            ui_mode: pitCalculated.ui_mode,     // Статус: "PIT", "OUT" или "DELTA"
            badge_text: pitCalculated.badge_text // Текст: "PIT", "OUT" или ""
        });
    });

    let showFlBanner = false;
    let absoluteBestTimeStr = "0:00.000";

    if (pilotsList.length > 0 && absoluteBestPilot !== "" && absoluteBestMs !== Infinity) {
        absoluteBestTimeStr = formatMillisecondsToRaceTime(absoluteBestMs);
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

