# Глобальный кэш абсолютного рекорда лобби
FASTEST_LAP_RECORD = {
    "has_record": False,
    "raw_ms": 99999999,
    "pilot_name": "",
    "car_number": "00",
    "formatted_time": ""
}

def format_ms_to_race_clock(ms: int) -> str:
    """Переводит миллисекунды в красивый формат М:СС.ссс"""
    if ms <= 0:
        return "0:00.000"
    minutes = ms // 60000
    seconds = (ms % 60000) // 1000
    milliseconds = ms % 1000
    return f"{minutes}:{seconds:02d}.{milliseconds:03d}"

def process_absolute_fastest_lap(pilot_name: str, pilot_best_ms: int):
    """Сравнивает время пилота с рекордом сессии (работает и в соло)"""
    global FASTEST_LAP_RECORD
    
    if pilot_best_ms <= 10000 or pilot_best_ms > 600000:
        return

    if FASTEST_LAP_RECORD["raw_ms"] == 99999999 or pilot_best_ms < FASTEST_LAP_RECORD["raw_ms"]:
        FASTEST_LAP_RECORD["raw_ms"] = pilot_best_ms
        FASTEST_LAP_RECORD["pilot_name"] = pilot_name
        FASTEST_LAP_RECORD["formatted_time"] = format_ms_to_race_clock(pilot_best_ms)
        FASTEST_LAP_RECORD["car_number"] = str(pilot_name.split("#")[-1]).strip() if "#" in pilot_name else "16"
        FASTEST_LAP_RECORD["has_record"] = True
