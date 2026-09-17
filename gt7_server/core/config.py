import os
import json

# Оперативное хранилище телеметрии лиги
DATABASE = {}
SESSION_BEST_LAPS = {}

# Параметры по умолчанию
TRACK_NAME = "RED BULL"
TOTAL_RACE_LAPS = 10
SESSION_MODE = "PRACTICE"
STATE_FILE = "race_state.json"

def load_server_state() -> dict:
    """Загружает сохраненное состояние трека, кругов и флагов из JSON"""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {
        "session_mode": SESSION_MODE,
        "track_name": TRACK_NAME,
        "total_laps": TOTAL_RACE_LAPS,
        "sc_status": "OFF"
    }

def save_server_state(state: dict):
    """Твой оригинальный метод: принимает весь словарь целиком и пишет на диск"""
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Ошибка записи JSON конфигурации: {e}")


