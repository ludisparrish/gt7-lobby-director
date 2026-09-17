import struct
import math
from modules.best_lap_manager import BestLapManager


class GT7PacketParser:
    def __init__(self, decrypted_data):
        self.data = decrypted_data
        self.best_lap_manager = BestLapManager()

    def _get_raw(self, fmt, offset):
        try:
            # struct.unpack ВСЕГДА возвращает кортеж. Забираем СТРОГО первый элемент [0]
            res = struct.unpack(fmt, self.data[offset:offset+struct.calcsize(fmt)])
            return res[0]
        except:
            return 0

    def normalize_position(self) -> int:
        return int(self._get_raw('h', 0x84))


    def normalize_current_lap(self) -> int:
        return int(self._get_raw('h', 0x74))

    def normalize_last_lap_ms(self) -> int:
        return int(self._get_raw('i', 0x7C))

    def normalize_speed_kmh(self) -> int:
        try:
            v = float(self._get_raw('f', 0x4C))
            v = 0.0 if math.isnan(v) or math.isinf(v) else v
            return int(v * 3.6)
        except:
            return 0

    def normalize_pit_and_track_status(self) -> int:
        return 1 if self.normalize_speed_kmh() < 1 else 2
    
    


    def parse_all(self) -> dict:
        """Твой оригинальный рабочий парсер с нативной подачей лучшего круга"""
        return {
            "position": self.normalize_position(),
            "current_lap": self.normalize_current_lap(),
            "last_lap_ms": self.normalize_last_lap_ms(), # Твой родной рабочий метод круга
            "speed_kmh": self.normalize_speed_kmh(),
            "pit_state": self.normalize_pit_and_track_status()
        }





