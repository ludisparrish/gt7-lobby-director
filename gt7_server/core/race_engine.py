import time

# Чистая оперативная память состояний для каждого пилота лиги
PIT_MEMORY = {}

def process_server_pit_clocks(pilot_name: str, pit_state: int, current_timestamp: float, current_badge_text: str) -> tuple:
    """
    ЭТАЛОННЫЙ СУДЕЙСКИЙ ДВИЖОК С ПАУЗОЙ ТАЙМЕРА (БЕЗ СИНТАКСИЧЕСКИХ ОШИБОК):
    - Выход из пита только после 5 секунд непрерывного статуса трассы (2) или выезда (3).
    - После подтверждения выезда — плашка TRACK горит 10 секунд, а таймер пита встает на ПАУЗУ.
    - Полная защита от дисконнектов (AFK) и простоев больше 120 секунд.
    """
    now = time.time()

    # 1. 🚨 СУДЕЙСКИЙ AFK ХУК: Жесткий дисконнект игры
    if pit_state == -1:
        return "AFK", "AFK", "AFK"

    # Инициализируем кэш пилота при первом появлении в сессии
    if pilot_name not in PIT_MEMORY:
        PIT_MEMORY[pilot_name] = {
            "current_state": "TRACK",     # Текущие состояния оверлея: TRACK, IN_BOX, ON_TRACK
            "entry_time": 0.0,            # Время въезда в боксы
            "exit_time": 0.0,             # Время реального выезда на трассу
            "track_status_start": 0.0,    # Таймер проверки 5 секунд стабильности трассы
            "paused_pit_duration": 0      # Замороженное время пита для вывода на плашку TRACK
        }

    mem = PIT_MEMORY[pilot_name]

    # =========================================================================
    # 🧮 ЛОГИКА СУДЕЙСКОГО ЗАМКА, ТАЙМ-АУТОВ И ЗАМОРОЗКИ ТАЙМЕРА НА ПАУЗУ
    # =========================================================================

    # А) ЕСЛИ ПРИСТАВКА ОФИЦИАЛЬНО ШЛЕТ ФЛАГ БОКСОВ (pit_state == 1)
    if pit_state == 1:
        if mem["current_state"] != "IN_BOX":
            mem["current_state"] = "IN_BOX"
            mem["entry_time"] = now
        
        mem["track_status_start"] = 0.0
        
        pit_duration = int(now - mem["entry_time"])
        if pit_duration > 120: 
            return "AFK", "AFK", "AFK"
            
        return "IN_BOX", "PIT", f"PIT {pit_duration}s"

    # Б) ЖЕСТКИЙ СИНТАКСИЧЕСКИЙ ФИКС: Проверяем стабильность, если статус равен 2 или 3
    elif pit_state in (2, 3):
        
        # Если мы до этого ехали по трассе в штатном режиме — просто катим дальше
        if mem["current_state"] == "TRACK":
            return "DELTA", "TRACK", ""

        # Если мы были в боксах (IN_BOX) и прилетела двойка/тройка от приставки
        if mem["current_state"] == "IN_BOX":
            if mem["track_status_start"] == 0.0:
                mem["track_status_start"] = now
            
            track_stable_duration = now - mem["track_status_start"]
            
            if track_stable_duration < 5.0:
                # 🛑 ЗАМОК АНИМАЦИИ: 5 секунд стабильной трассы еще не прошло! Таймер крутим дальше!
                pit_duration = int(now - mem["entry_time"])
                return "IN_BOX", "PIT", f"PIT {pit_duration}s"
            else:
                # 🟢 ВЫЕЗД ПОДТВЕРЖДЕН: Статус трассы удержался дольше 5 секунд подряд!
                mem["current_state"] = "ON_TRACK"
                mem["exit_time"] = now
                mem["paused_pit_duration"] = int(now - mem["entry_time"] - 5.0)

        # В) РЕЖИМ ВЫЕЗДА "ON_TRACK": ДЕРЖИМ ПЛАШКУ И ТАЙМЕР НА ПАУЗЕ 10 СЕКУНД
        if mem["current_state"] == "ON_TRACK":
            if now - mem["exit_time"] < 10.0:
                return "ON_TRACK", "TRACK", f"PIT {mem['paused_pit_duration']}s"
            else:
                mem["current_state"] = "TRACK"
                mem["track_status_start"] = 0.0
                return "DELTA", "TRACK", ""

    return "DELTA", "TRACK", ""
