class BestLapManager:
    def __init__(self):
        self.best_lap_ms = 0
        self.last_seen_lap_count = -1
        self.current_lap_is_valid = True

    def process_lap_data(self, last_lap_ms: int, lap_count: int, pit_state: int, position: int) -> int:
        """
        Гоночный менеджер:
        Игнорирует 1-й круг сессии (Out-Lap), сбрасывает кэш при position == -1.
        """
        try:
            # СБРОС СЕССИИ ПРИ РЕСТАРТЕ/ВЫЛЕТЕ
            if position == -1:
                self.best_lap_ms = 0
                self.last_seen_lap_count = -1
                self.current_lap_is_valid = True
                return 0

            # СМЕНА КРУГА НА ФИНИШЕ
            if lap_count != self.last_seen_lap_count:
                # Проверяем, что это НЕ первый круг заезда (last_seen_lap_count > 1)
                if self.last_seen_lap_count > 1 and last_lap_ms > 0 and self.current_lap_is_valid:
                    if self.best_lap_ms == 0 or last_lap_ms < self.best_lap_ms:
                        self.best_lap_ms = last_lap_ms
                
                self.last_seen_lap_count = lap_count
                self.current_lap_is_valid = True

            # ИНВАЛИДАЦИЯ КРУГА ПРИ ЗАЕЗДЕ В ПИТЫ
            if pit_state == 1 or lap_count <= 0:
                self.current_lap_is_valid = False

        except Exception:
            return self.best_lap_ms

        return self.best_lap_ms



