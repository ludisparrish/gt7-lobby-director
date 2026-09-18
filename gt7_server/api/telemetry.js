const express = require('express');
const router = express.Router();
const { formatMillisecondsToRaceTime } = require('../core/timeInterpreter');
const { processServerPitStates } = require('../core/raceEngine');

const DATABASE = {};

const SERVER_STATE = {
    session_mode: "PRACTICE", 
    track_name: "RED BULL",
    total_laps: 10,
    sc_status: "OFF"          
};

/* ====================================================================
   📥 АСИНХРОННЫЕ ПРИЕМНИКИ ДАННЫХ ИЗ АДМИН-ПУЛЬТА (POST МАРШРУТЫ)
   ==================================================================== */
router.post('/api/admin/config', (req, res) => {
    const data = req.body || {};
    if (data.track_name !== undefined) SERVER_STATE.track_name = data.track_name.toUpperCase();
    if (data.total_laps !== undefined) SERVER_STATE.total_laps = parseInt(data.total_laps) || 10;
    res.json({ status: "success", state: SERVER_STATE });
});

router.post('/api/admin/mode', (req, res) => {
    const data = req.body || {};
    if (data.session_mode !== undefined) SERVER_STATE.session_mode = data.session_mode;
    res.json({ status: "success", state: SERVER_STATE });
});

router.post('/api/admin/sc', (req, res) => {
    const data = req.body || {};
    if (data.sc_status !== undefined) SERVER_STATE.sc_status = data.sc_status;
    res.json({ status: "success", state: SERVER_STATE });
});

/* ====================================================================
   📥 ПРИЕМНИК ТЕЛЕМЕТРИИ С MAC-ЛАУНЧЕРА
   ==================================================================== */
router.post('/api/telemetry', (req, res) => {
    const data = req.body || {};
    if (!data || !data.pilot_name) {
        return res.status(400).json({ status: "error", message: "No data" });
    }

    const pilot = data.pilot_name;
    DATABASE[pilot] = {
        position: data.position || "-",
        current_lap: parseInt(data.current_lap) || 0,
        pit_state: parseInt(data.pit_state) || 2,
        last_lap_ms: parseInt(data.raw_last_lap_ms) || parseInt(data.last_lap_ms) || 0,
        best_lap_ms: parseInt(data.best_lap_ms) || 0,
        last_update: Date.now() / 1000
    };

    res.json({ status: "success", sc_status: SERVER_STATE.sc_status });
});

/* ====================================================================
   📤 ВЫДАТЧИК ДАННЫХ ДЛЯ ВЕБ-ОВЕРЛЕЯ
   ==================================================================== */
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

    // 🔥 ЖЕСТКИЙ ИНЖЕНЕРНЫЙ ФИКС СТРУКТУРЫ МАССИВА:
    // Разворачиваем первый кортеж sortedPilots[0] и берем из него данные объекта пилота [1]
    let leaderCurrentLap = 0;
    if (sortedPilots.length > 0 && sortedPilots[0][1]) {
        leaderCurrentLap = sortedPilots[0][1].current_lap || 0;
    }

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

        const pitCalculated = processServerPitStates(pName, pData.pit_state);

        pilotsList.push({
            pilot_name: pName,
            position: displayPosition,
            current_lap: pData.current_lap,
            best_lap: formatMillisecondsToRaceTime(pData.best_lap_ms), 
            lap_time: formatMillisecondsToRaceTime(pData.last_lap_ms), 
            ui_mode: pitCalculated.ui_mode,     
            badge_text: pitCalculated.badge_text 
        });
    });

    let headerSessionString = SERVER_STATE.session_mode;
    if (SERVER_STATE.session_mode === "QUALI") headerSessionString = "QUALI";
    
    if (SERVER_STATE.session_mode === "RACE") {
        headerSessionString = `LAP ${leaderCurrentLap} / ${SERVER_STATE.total_laps}`;
    }

    let showFlBanner = false;
    let absoluteBestTimeStr = "0:00.000";

    if (pilotsList.length > 0 && absoluteBestPilot !== "" && absoluteBestMs !== Infinity) {
        absoluteBestTimeStr = formatMillisecondsToRaceTime(absoluteBestMs);
        showFlBanner = true;
    }

    res.json({
        sc_status: SERVER_STATE.sc_status,
        session_mode: headerSessionString, 
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
