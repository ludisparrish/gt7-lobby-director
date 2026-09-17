import time
from flask import Blueprint, request, jsonify
from core.race_engine import process_server_pit_clocks

# Монолитное оперативное хранилище телеметрии лиги внутри модуля
DATABASE = {}
SESSION_BEST_LAPS = {}

# Текущее состояние конфигурации сессии сервера SRO
SERVER_STATE = {
    "session_mode": "PRACTICE",  # Наша синяя кнопка по умолчанию
    "track_name": "RED BULL",
    "total_laps": 10,
    "sc_status": "OFF"
}

telemetry_api = Blueprint('telemetry_api', __name__)

@telemetry_api.route('/api/session_mode', methods=['POST'])
def change_session_mode():
    """Роут переключения режимов (ПРАКТИКА / КВАЛА / ГОНКА) из админки"""
    data = request.json or {}
    mode = data.get("session_mode", "PRACTICE")
    SERVER_STATE["session_mode"] = mode
    
    # Принудительно очищаем кэш рекордов при ручной смене режима судьёй
    SESSION_BEST_LAPS.clear()
    return jsonify({"status": "success", "session_mode": mode})

@telemetry_api.route('/api/track_settings', methods=['POST'])
def change_track_settings():
    """Роут сохранения названия трека и кругов гонки из админки"""
    data = request.json or {}
    SERVER_STATE["track_name"] = data.get("track_name", "RED BULL")
    SERVER_STATE["total_laps"] = int(data.get("total_laps", 10))
    return jsonify({"status": "success"})

@telemetry_api.route('/api/safety_car', methods=['POST'])
def change_safety_car():
    """Роут переключения судейских флагов Safety Car"""
    data = request.json or {}
    SERVER_STATE["sc_status"] = data.get("sc_status", "OFF")
    return jsonify({"status": "success", "sc_status": SERVER_STATE["sc_status"]})

@telemetry_api.route('/api/telemetry', methods=['POST'])
def receive_telemetry():
    """Главный приемник пакетов телеметрии от Mac-лаунчера"""
    data = request.json
    if not data or "pilot_name" not in data: 
        return jsonify({"status": "error"}), 400
        
    pilot = data["pilot_name"]
    current_lap = int(data.get("current_lap", 0))
    pit_state = int(data.get("pit_state", 2))
    
    try: pos = int(data.get("position", -1))
    except: pos = -1
        
    # Принимаем чистый лучший круг, который посчитал твой BestLapManager на Mac!
    pilot_best_ms = int(data.get("best_lap_ms", 0))

    # СУДЕЙСКИЙ ФИЛЬТР: Отсекаем дикое переполнение Unix-таймстампов Mac
    if pilot_best_ms > 600000 or pilot_best_ms < 10000:
        pilot_best_ms = 0

    # Правило сброса сессии пилота по флагу -1 в Квале и Гонке
    if pos == -1 and SERVER_STATE["session_mode"] in ["QUALIFY", "RACE"]:
        if pilot in SESSION_BEST_LAPS:
            del SESSION_BEST_LAPS[pilot]

    # Пишем в оперативный кэш рекордов сессии
    if pilot_best_ms > 0:
        SESSION_BEST_LAPS[pilot] = pilot_best_ms

    # 🔥 ЖЕСТКИЙ ФИКС: Записываем прилетевший лучший круг прямо в DATABASE пилота!
    DATABASE[pilot] = {
        "position": pos,
        "current_lap": current_lap,
        "pit_state": pit_state,
        "best_lap_ms": pilot_best_ms,  # КЛЮЧ ВОССТАНОВЛЕН И ЗАФИКСИРОВАН!
        "last_update": time.time()
    }
    
    return jsonify({"status": "success", "sc_status": SERVER_STATE["sc_status"]})

@telemetry_api.route('/api/data', methods=['GET'])
def get_data():
    """Выдает скомпилированный JSON для рендеринга оверлея и админки"""
    now = time.time()
    pilots_source = DATABASE if 'DATABASE' in globals() else {}
    
    # Даем запас онлайна пилотам в 6 секунд
    active = {p: d for p, d in pilots_source.items() if now - d.get("last_update", 0) < 6.0}
    
    sorted_pilots = []
    if active:
        try:
            sorted_pilots = sorted(active.items(), key=lambda x: int(x.get('position', 99)) if str(x.get('position', '')).isdigit() and int(x.get('position', 0)) > 0 else 99)
        except:
            sorted_pilots = list(active.items())
        
    pilots_list = []
    for idx, (p_name, p_data) in enumerate(sorted_pilots[:16]):
        
        # Забираем миллисекунды лучшего круга пилота напрямую из нашей общей базы!
        best_lap_str = "0:00.000"
        pilot_ms = p_data.get("best_lap_ms", 0)
        
        # Если в DATABASE пусто (например, первый круг), страхуемся из SESSION_BEST_LAPS
        if pilot_ms == 0:
            pilot_ms = SESSION_BEST_LAPS.get(p_name, 0)
            
        if pilot_ms > 0:
            minutes = pilot_ms // 60000
            seconds = (pilot_ms % 60000) // 1000
            milliseconds = pilot_ms % 1000
            best_lap_str = f"{minutes}:{seconds:02d}.{milliseconds:03d}"

        # Гоночный селектор вывода: GAP в гонке или ЛУЧШЕЕ ВРЕМЯ в практике/квале
        if idx == 0:
            time_string = "LEADER" if SERVER_STATE["session_mode"] == "RACE" else best_lap_str
        else:
            time_string = f"+{idx * 1.5:.1f}s" if SERVER_STATE["session_mode"] == "RACE" else best_lap_str

        # Бронебойная обработка статуса пит-стопов пилота
        ui_mode = "DELTA"
        raw_pit = str(p_data.get("pit_state", "2"))
        if raw_pit == "1":
            ui_mode = "IN_BOX"
        elif raw_pit == "3":
            ui_mode = "ON_TRACK"

        # Забираем чистую позицию с клиента Mac
        display_position = p_data.get("position", "-")
        if int(display_position) <= 0:
            display_position = "-"

        # Передаем правильные аргументы в движок пит-стопов
        engine_ui_mode, pit_badge_status, pit_clock_output = process_server_pit_clocks(
            p_name,
            int(p_data.get("pit_state", 2)),
            float(p_data.get("last_update", now)),
            time_string
        )

        final_pit_clock = ""
        if engine_ui_mode in ["IN_BOX", "ON_TRACK"]:
            final_pit_clock = pit_clock_output
            ui_mode = engine_ui_mode
        elif engine_ui_mode == "AFK":
            ui_mode = "AFK"

        pilots_list.append({
            "pilot_name": p_name,
            "position": display_position,
            "current_lap": p_data.get("current_lap", 0),
            "best_lap": best_lap_str,        # Твои чистые, живые гоночные времена!
            "pit_clock": final_pit_clock,    # Живой счетчик секунд пита или пауза
            "ui_mode": ui_mode
        })

    # ДИНАМИЧЕСКИЙ АБСОЛЮТНЫЙ РАСЧЕТ FASTEST LAP ДЛЯ ФИОЛЕТОВОЙ ПЛАШКИ
    fastest_pilot = ""
    fastest_time_str = "0:00.000"
    fastest_car = "00"
    show_banner = False

    valid_laps = {p: ms for p, ms in SESSION_BEST_LAPS.items() if ms > 0}
    if valid_laps:
        try:
            f_pilot, f_ms = min(valid_laps.items(), key=lambda x: x)
            if f_ms > 0:
                fastest_pilot = f_pilot
                fastest_time_str = f"{f_ms//60000}:{(f_ms%60000)//1000:02d}.{f_ms%1000:03d}"
                fastest_car = str(f_pilot.split("#")[-1]).strip() if "#" in f_pilot else "16"
                show_banner = True
        except:
            pass

    return jsonify({
        "sc_status": SERVER_STATE["sc_status"],
        "session_mode": SERVER_STATE["session_mode"],
        "track_name": SERVER_STATE["track_name"],
        "total_laps": SERVER_STATE["total_laps"],
        "pilots": pilots_list,
        "fastest_lap": {
            "show_banner": show_banner,
            "pilot_name": fastest_pilot,
            "car_number": fastest_car,
            "time": fastest_time_str
        }
    })

