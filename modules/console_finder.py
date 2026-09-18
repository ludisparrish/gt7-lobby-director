import socket
import select
from PyQt6.QtCore import QThread, pyqtSignal

class PS5DiscoveryThread(QThread):
    """
    🏎️ SRO GT7 CONSOLE FINDER (CLIENT-SIDE)
    Асинхронный поток для автоматического поиска PlayStation в локальной сети.
    """
    # Сигнал возвращает найденный IP-адрес консоли в главное окно UI
    console_found = pyqtSignal(str)
    scan_finished = pyqtSignal()

    def __init__(self, timeout=3.0):
        super().__init__()
        self.timeout = timeout

    def run(self):
        # Открываем UDP сокет для отправки широковещательного пакета (Broadcast)
        udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        udp_socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        udp_socket.setblocking(False)

        try:
            # 🏁 Стандартный Discovery-пакет, на который откликается Gran Turismo 7
            # Отправляем триггер на порт 19999 или 33739 по всей локальной сети
            discovery_msg = b"丁7" # Специфический байт-маркер Gran Turismo
            
            # Шлем бродкаст на порты телеметрии игры
            for port in:
                udp_socket.sendto(discovery_msg, ('255.255.255.255', port))

            # Ждем ответ от приставки в течение заданного таймаута
            ready = select.select([udp_socket], [], [], self.timeout)
            
            if ready[0]:
                data, addr = udp_socket.recvfrom(1024)
                # addr[0] — это и есть чистый IP-адрес твоей приставки в сети!
                if addr[0]:
                    print(f"🎯 Сканер: Обнаружена консоль PS! IP: {addr[0]}")
                    self.console_found.emit(addr[0])
                    return

            print("⚠️ Сканер: Консоль не ответила на авто-поиск.")
            
        except Exception as e:
            print(f"⚠️ Сбой авто-поиска консоли: {e}")
        finally:
            udp_socket.close()
            self.scan_finished.emit()
