import time
import socket
from PyQt6.QtCore import QThread, pyqtSignal

# Твои оригинальные прямые импорты для структуры проекта
from modules.packet_parser import GT7PacketParser
from modules.gt7telemetry import salsa20_dec

ReceivePort = 33740
SendPort = 33739

class TelemetryWorker(QThread):
    status_signal = pyqtSignal(str)
    data_signal = pyqtSignal(dict)

    def __init__(self, ps_ip, publisher_worker):
        super().__init__()
        self.ps_ip = ps_ip
        self.publisher = publisher_worker
        self.running = True
        self.sock = None

    def run(self):
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.sock.bind(('0.0.0.0', ReceivePort))
            self.sock.settimeout(1.0)
        except:
            self.status_signal.emit("🔴 Ошибка порта UDP")
            return

        last_heartbeat_time = 0

        while self.running:
            current_time = time.monotonic()

            if current_time - last_heartbeat_time >= 1.0:
                try:
                    self.sock.sendto(b'A', (self.ps_ip, SendPort))
                    last_heartbeat_time = current_time
                except:
                    time.sleep(0.5)
                    continue

            try:
                data, addr = self.sock.recvfrom(4096)
            except socket.timeout:
                self.status_signal.emit("⏳ Ожидание пакетов от PS5...")
                continue
            except:
                if not self.running: break
                continue

            if len(data) == 296:
                try:
                    ddata = salsa20_dec(data)
                    if len(ddata) == 0: continue

                    parser = GT7PacketParser(ddata)
                    clean_data = parser.parse_all()

                    self.data_signal.emit(clean_data)
                    self.status_signal.emit("🟢 Связь с PS5: Телеметрия активна")
                    
                    # Мгновенная передача данных в сетевой воркер без блокировок
                    self.publisher.update_data(clean_data)
                except:
                    pass

    def stop(self):
        self.running = False
        if self.sock:
            try: self.sock.close()
            except: pass
