import time
import requests
from PyQt6.QtCore import QThread, pyqtSignal

# НАМЕРТВО ЗАШИТЫЙ АДРЕС ТВОЕГО VPS СЕРВЕРА В РФ
SERVER_URL = "http://191.44.45.114:8000"

class HTTPPublishWorker(QThread):
    server_status_signal = pyqtSignal(str)
    sc_status_signal = pyqtSignal(str)

    def __init__(self, pilot_name, pilot_number):
        super().__init__()
        self.full_pilot_string = f"{pilot_name} #{pilot_number}"
        self.running = True
        self.latest_data = None
        # Твоя оригинальная быстрая сессия requests
        self.session = requests.Session()
        self.last_known_sc_status = "OFF"

    def update_data(self, clean_data):
        self.latest_data = clean_data

    def run(self):
        while self.running:
            # ИСПРАВЛЕНО: Явно проверяем на None и забираем пакет с обнулением
            if self.latest_data is not None:
                data_to_send = self.latest_data
                self.latest_data = None  # ФИКС: Очищаем буфер, чтобы не спамить дубликатами!
                self._send_payload(data_to_send)
            else:
                self._just_ping_server_stable()
            time.sleep(0.25) # Четкие судейские 4 Гц

    def _send_payload(self, clean_data):
        payload = {
            "pilot_name": self.full_pilot_string,
            "position": clean_data["position"],
            "current_lap": clean_data["current_lap"],
            "raw_last_lap_ms": clean_data["last_lap_ms"],
            "pit_state": clean_data["pit_state"],
            "best_lap_ms": clean_data.get("best_lap_ms", 0)
        }
        try:
            # Короткий таймаут, чтобы Mac не зависал
            res = self.session.post(f"{SERVER_URL}/api/telemetry", json=payload, timeout=0.4)
            if res.status_code == 200:
                self.server_status_signal.emit("🟢 Связь с VPS: Активна (Телеметрия + Флаги)")
                server_status = res.json().get("sc_status", "OFF")
                if server_status != self.last_known_sc_status:
                    self.last_known_sc_status = server_status
                    self.sc_status_signal.emit(server_status)
        except:
            self.server_status_signal.emit("🔴 Ошибка VPS: Сбой связи в заезде!")

    def _just_ping_server_stable(self):
        try:
            res = self.session.get(f"{SERVER_URL}/api/data", timeout=0.4)
            if res.status_code == 200:
                self.server_status_signal.emit("🟢 Связь с VPS: Стабильная (Ожидание заезда)")
                server_status = res.json().get("sc_status", "OFF")
                if server_status != self.last_known_sc_status:
                    self.last_known_sc_status = server_status
                    self.sc_status_signal.emit(server_status)
        except:
            pass

    def stop(self):
        self.running = False
        try: self.session.close()
        except: pass
