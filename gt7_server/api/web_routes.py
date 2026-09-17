import time
import os
from flask import Blueprint, render_template, request
import core.config as cfg
from core.config import load_server_state, save_server_state

web_ui = Blueprint('web_routes', __name__)

@web_ui.route('/')
def main_hub():
    state = load_server_state()
    active_list = [name for name, d in cfg.DATABASE.items() if time.time() - d["last_update"] < 4.0]
    return render_template(
        "index.html", 
        active_count=len(active_list),
        track_name=state.get("track_name", cfg.TRACK_NAME),
        total_laps=state.get("total_laps", cfg.TOTAL_RACE_LAPS)
    )

@web_ui.route('/admin', methods=['GET', 'POST'])
def admin_panel():
    from core.lap_analyzer import FASTEST_LAP_RECORD
    success = False
    alert_message = "🟢 Конфигурация успешно обновлена!"
    state = load_server_state()
    
    if request.method == 'POST':
        sc_flag_click = request.form.get("sc_status")
        if sc_flag_click in ["ON", "OFF", "CLEAR"]:
            save_server_state("sc_status", sc_flag_click)
            success = True
            
        session_click = request.form.get("session_mode")
        if session_click in ["QUALIFY", "RACE"]:
            cfg.SESSION_MODE = session_click
            save_server_state("session_mode", session_click)
            success = True
            
        track_click = request.form.get("track_name")
        laps_click = request.form.get("total_laps")
        if track_click or laps_click:
            if track_click:
                cfg.TRACK_NAME = track_click.strip().upper()
                save_server_state("track_name", cfg.TRACK_NAME)
            if laps_click:
                cfg.TOTAL_RACE_LAPS = int(laps_click)
                save_server_state("total_laps", cfg.TOTAL_RACE_LAPS)
            success = True

        # СБРОСИТЬ ВСЕ ВРЕМЕНА: Стираем данные из сквозного общего объекта ядра!
        if request.form.get("reset_lobby") == "true":
            cfg.DATABASE.clear()
            cfg.SESSION_BEST_LAPS.clear()
            cfg.PILOT_LAP_LOGS.clear()
            cfg.SERVER_PIT_DB.clear()
            
            # Намертво сшибаем и обнуляем фиолетовый баннер Fastest Lap
            FASTEST_LAP_RECORD["pilot_name"] = ""
            FASTEST_LAP_RECORD["car_number"] = "00"
            FASTEST_LAP_RECORD["raw_ms"] = 99999999
            FASTEST_LAP_RECORD["formatted_time"] = ""
            FASTEST_LAP_RECORD["has_record"] = False
            
            alert_message = "⚡ ЛОББИ СБРОШЕНО! Время кругов и рекорды очищены."
            success = True
            
        state = load_server_state()

    active_list = [name for name, d in cfg.DATABASE.items() if time.time() - d["last_update"] < 4.0]

    return render_template(
        "admin.html",
        track_name=state.get("track_name", cfg.TRACK_NAME),
        total_laps=state.get("total_laps", cfg.TOTAL_RACE_LAPS),
        sc_status=state.get("sc_status", "OFF"),
        session_mode=state.get("session_mode", cfg.SESSION_MODE),
        active_count=len(active_list),
        success=success,
        alert_message=alert_message
    )

@web_ui.route('/overlay')
def overlay_page():
    return render_template("overlay.html")
