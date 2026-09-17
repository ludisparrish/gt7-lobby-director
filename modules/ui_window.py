import os
import sys
import json
import time
import requests
from PyQt6.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton, QStackedWidget, QSlider
from PyQt6.QtCore import pyqtSignal, Qt, QUrl

# ИМПОРТИРУЕМ РОДНЫЕ МУЛЬТИМЕДИЙНЫЕ МОДУЛИ И БРАУЗЕРНЫЙ ДВИЖОК CHROMIUM ОТ QT6
from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
from PyQt6.QtWebEngineCore import QWebEngineProfile
from PyQt6.QtWebEngineWidgets import QWebEngineView

# Импортируем наши изолированные фоновые потоки связи
from modules.network_worker import HTTPPublishWorker, SERVER_URL
from modules.telemetry_worker import TelemetryWorker
from modules.best_lap_manager import BestLapManager


# Автоматически создаваемый конфиг пилота в Документах Mac
CONFIG_FILE = os.path.join(os.path.expanduser("~/Documents"), "gt7_pilot_config.json")


class LauncherWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.worker = None
        self.publisher = None
        self.config = {}
        self.current_sc_state = "OFF" 
        self.is_sound_testing = False 
        self.lap_manager = BestLapManager()
        
        self.setWindowTitle("Телеметрия")
        self.resize(440, 480)
        self.stacked_layout = QStackedWidget(self)
        self.init_settings_screen()
        self.init_main_screen()
        
        v_layout = QVBoxLayout()
        v_layout.addWidget(self.stacked_layout)
        self.setLayout(v_layout)
        self.load_config()

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f: self.config = json.load(f)
                self.input_name.setText(self.config.get("pilot_name", ""))
                self.input_num.setText(self.config.get("pilot_number", ""))
                self.input_ip.setText(self.config.get("ps_ip", ""))
                self.lbl_pilot_info.setText(f"👤 Пилот: <b>{self.config.get('pilot_name')}</b> | Номер: <b>#{self.config.get('pilot_number')}</b>")
                self.lbl_ps_info.setText(f"🎮 IP Консоли: <b>{self.config.get('ps_ip')}</b>")
                self.stacked_layout.setCurrentIndex(1)
            except: self.stacked_layout.setCurrentIndex(0)
        else: self.stacked_layout.setCurrentIndex(0)

    def save_config(self):
        name = self.input_name.text().strip()
        num = self.input_num.text().strip()
        ip = self.input_ip.text().strip()
        if not name or not num or not ip: return
        self.config = {"pilot_name": name, "pilot_number": num, "ps_ip": ip}
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f: json.dump(self.config, f, indent=4)
        self.lbl_pilot_info.setText(f"👤 Пилот: <b>{name}</b> | Номер: <b>#{num}</b>")
        self.lbl_ps_info.setText(f"🎮 IP Консоли: <b>{ip}</b>")
        self.stacked_layout.setCurrentIndex(1)

    def init_settings_screen(self):
        screen = QWidget()
        layout = QVBoxLayout()
        layout.addWidget(QLabel("<h2>🛠️ НАСТРОЙКА ПУЛЬТА ПИЛОТА</h2>"))
        layout.addWidget(QLabel("Имя / Никнейм пилота лиги:"))
        self.input_name = QLineEdit()
        layout.addWidget(self.input_name)
        layout.addWidget(QLabel("Стартовый бортовой номер:"))
        self.input_num = QLineEdit()
        layout.addWidget(self.input_num)
        layout.addWidget(QLabel("IP-адрес PlayStation 5 в домашней сети:"))
        self.input_ip = QLineEdit()
        layout.addWidget(self.input_ip)
        btn_save = QPushButton("💾 СОХРАНИТЬ КОНФИГУРАЦИЮ")
        btn_save.setStyleSheet("background-color: #2b8a3e; color: white; font-weight: bold; padding: 10px; border-radius: 0px;")
        btn_save.clicked.connect(self.save_config)
        layout.addWidget(btn_save)
        screen.setLayout(layout)
        self.stacked_layout.addWidget(screen)
    def init_main_screen(self):
        screen = QWidget()
        layout = QVBoxLayout()
        layout.addWidget(QLabel("<h2>🏎️ ТЕЛЕМЕТРИЯ </h2>"))
        self.lbl_pilot_info = QLabel("👤 Пилот: -- | Номер: --")
        layout.addWidget(self.lbl_pilot_info)
        self.lbl_ps_info = QLabel("🎮 IP Консоли: --")
        layout.addWidget(self.lbl_ps_info)
        layout.addWidget(QLabel("<hr>"))
        
        self.btn_action = QPushButton("🏁 ЗАПУСТИТЬ ТРАНСЛЯЦИЮ ТЕЛЕМЕТРИИ")
        self.btn_action.setStyleSheet("background-color: #e31e24; color: white; font-weight: bold; font-size: 14px; padding: 14px; border-radius: 0px;")
        self.btn_action.clicked.connect(self.toggle_stream)
        layout.addWidget(self.btn_action)
        
        self.lbl_ps_status = QLabel("⚪ Связь с PS5: Остановлено")
        layout.addWidget(self.lbl_ps_status)
        self.lbl_vps_status = QLabel("⚪ Связь с VPS в РФ: Ожидание...")
        layout.addWidget(self.lbl_vps_status)
        
        self.lbl_sc_hud = QLabel("RACE CONTROL: NO FLAGS")
        self.lbl_sc_hud.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.lbl_sc_hud.setStyleSheet("background-color: #222; color: #888; font-weight: bold; padding: 8px; font-size: 14px;")
        layout.addWidget(self.lbl_sc_hud)
        
        self.lbl_telemetry_hud = QLabel("<b>📊 СТАТУС: -- | ПОЗ: -- | КРУГ: --</b>")
        self.lbl_telemetry_hud.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.lbl_telemetry_hud)

        # НЕВИДИМОЕ БРАУЗЕРНОЕ УХО (Размер 1x1 пиксель)
        self.browser = QWebEngineView()
        self.browser.setFixedSize(1, 1)
        QWebEngineProfile.defaultProfile().setHttpCacheType(QWebEngineProfile.HttpCacheType.NoCache)
        layout.addWidget(self.browser)
        
        
        btn_go_settings = QPushButton("⚙️ Изменить параметры пилота / IP")
        btn_go_settings.setStyleSheet("border-radius: 0px; margin-top: 15px;")
        btn_go_settings.clicked.connect(lambda: self.stacked_layout.setCurrentIndex(0))
        layout.addWidget(btn_go_settings)
        screen.setLayout(layout)
        self.stacked_layout.addWidget(screen)



    def toggle_stream(self):
        if self.worker and self.worker.isRunning():
            self.worker.stop(); self.worker.wait(); self.worker = None
            if self.publisher: self.publisher.stop(); self.publisher.wait(); self.publisher = None
            self.stop_any_sound()
            self.browser.setUrl(QUrl("about:blank"))
            self.current_sc_state = "OFF"
            self.btn_action.setText("🏁 ЗАПУСТИТЬ ТРАНСЛЯЦИЮ ТЕЛЕМЕТРИИ")
            self.btn_action.setStyleSheet("background-color: #e31e24; color: white; font-weight: bold; font-size: 14px; padding: 14px; border-radius: 0px;")
            self.lbl_ps_status.setText("⚪ Связь с PS5: Остановлено")
            self.lbl_vps_status.setText("⚪ Связь с VPS в РФ: Ожидание...")
            self.lbl_sc_hud.setText("RACE CONTROL: NO FLAGS")
            self.lbl_sc_hud.setStyleSheet("background-color: #222; color: #888; font-weight: bold; padding: 8px; font-size: 14px;")
            self.lbl_telemetry_hud.setText("<b>📊 СТАТУС: -- | ПОЗ: -- | КРУГ: --</b>")
        else:
            if self.is_sound_testing: self.toggle_sound_test()
            self.lbl_vps_status.setText("🔍 Подключение встроенного Chromium к VPS...")
            QApplication.processEvents()
            
            name = self.config.get("pilot_name"); num = self.config.get("pilot_number"); ip = self.config.get("ps_ip")
            
            self.publisher = HTTPPublishWorker(name, num)
            self.publisher.server_status_signal.connect(self.lbl_vps_status.setText)
            self.publisher.start()
            
            self.worker = TelemetryWorker(ip, self.publisher)
            self.worker.status_signal.connect(self.lbl_ps_status.setText)
            self.worker.data_signal.connect(self.update_mini_hud)
            self.worker.start()
            
            self.browser.setUrl(QUrl(f"{SERVER_URL}/api/data?t={int(time.time() * 1000)}"))
            
            from PyQt6.QtCore import QTimer
            self.page_refresh_timer = QTimer(self)
            self.page_refresh_timer.timeout.connect(self.refresh_browser_page)
            self.page_refresh_timer.start(400)
            
            self.btn_action.setText("⏹️ ОСТАНОВИТЬ ТРАНСЛЯЦИЮ ТЕЛЕМЕТРИИ")
            self.btn_action.setStyleSheet("background-color: #222222; color: #ff3333; font-weight: bold; font-size: 14px; padding: 14px; border-radius: 0px;")

    def refresh_browser_page(self):
        if self.worker and self.worker.isRunning():
            self.browser.setUrl(QUrl(f"{SERVER_URL}/api/data?t={int(time.time() * 1000)}"))
            self.browser.page().toPlainText(self.parse_browser_json_response)

    def parse_browser_json_response(self, html_text):
        if not html_text: return
        try:
            server_json = json.loads(html_text)
            sc_status = server_json.get("sc_status", "OFF")
            self.process_race_control_audio(sc_status)
        except:
            pass

    def process_race_control_audio(self, sc_status):
        if sc_status == self.current_sc_state: return
        self.current_sc_state = sc_status
        
        if sc_status == "ON":
            self.lbl_sc_hud.setText("⚠️ VSC ON: СБАВЬТЕ СКОРОСТЬ!")
            self.lbl_sc_hud.setStyleSheet("background-color: #ffff00; color: #111; font-weight: bold; padding: 8px; font-size: 14px;")
            
            # ЖЕСТКИЙ СТАНДАРТ ЛИГИ: Сирена играет ровно 12 секунд
            self.play_system_sound("sc_on.ogg", duration_seconds=12)
            
        elif sc_status == "CLEAR":
            self.lbl_sc_hud.setText("✅ VSC OFF: ГОНКА ПРОДОЛЖАЕТСЯ")
            self.lbl_sc_hud.setStyleSheet("background-color: #2b8a3e; color: #fff; font-weight: bold; padding: 8px; font-size: 14px;")
            self.play_system_sound("sc_off.ogg", duration_seconds=12)
            
            # ЖЕСТКИЙ СТАНДАРТ ЛИГИ: Зеленый флаг играет ровно 9 секунд
        else:
            self.lbl_sc_hud.setText("RACE CONTROL: NO FLAGS")
            self.lbl_sc_hud.setStyleSheet("background-color: #222; color: #888; font-weight: bold; padding: 8px; font-size: 14px;")
            self.stop_any_sound()

    def update_mini_hud(self, data):
        state = data.get("pit_state", 2)
        state_str = "🟢 TRACK" if state == 2 else "🛠️ IN BOX"
        pilot_name = "G. LUDIS #16"
        
        # Вытаскиваем параметры из твоего оригинального парсера
        last_ms = int(data.get("last_lap_ms", 0))
        current_lap = int(data.get("current_lap", 0))
        
        # Безопасно парсим позицию в чистый Integer (если там прилетела строка или минус)
        try:
            pos = int(data.get("position", -1))
        except:
            pos = -1
        
        # 🔥 ОБНОВЛЕННЫЙ ВЫЗОВ: Передаем позицию для автосброса при -1 флагах!
        best_ms = self.lap_manager.process_lap_data(last_ms, current_lap, state, pos)

        # Ниже идет твое оригинальное форматирование времени в столбик...
        if last_ms > 0:
            minutes = last_ms // 60000
            seconds = (last_ms % 60000) // 1000
            milliseconds = last_ms % 1000
            lap_time_str = f"{minutes}:{seconds:02d}.{milliseconds:03d}"
        else:
            lap_time_str = "0:00.000"

        if best_ms > 0:
            b_minutes = best_ms // 60000
            b_seconds = (best_ms % 60000) // 1000
            b_milliseconds = best_ms % 1000
            best_time_str = f"{b_minutes}:{b_seconds:02d}.{b_milliseconds:03d}"
        else:
            best_time_str = "0:00.000"

        self.lbl_telemetry_hud.setText(
            f"<b>📊 СТАТУС: {state_str} | ПИЛОТ: {pilot_name}</b><br>"
            f"<b>⏱️ ПОСЛЕДНИЙ КРУГ: {lap_time_str}</b><br>"
            f"<b>🏆 ЛУЧШИЙ КРУГ СЕССИИ: {best_time_str}</b><br>"
            f"<b>🏁 ПОЗИЦИЯ: P{data.get('position', '-')} | ТЕКУЩИЙ КРУГ: {current_lap}</b>"
        )

        if hasattr(self, 'publisher') and self.publisher:
            data["best_lap_ms"] = best_ms
            self.publisher.update_data(data)













