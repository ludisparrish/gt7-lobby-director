from flask import Flask, render_template
from api.telemetry_routes import telemetry_api

app = Flask(__name__)

# Бесшовно регистрируем изолированный модуль гоночных маршрутов API
app.register_blueprint(telemetry_api)

@app.route('/')
def index_page():
    """Главная страница выбора SRO (Админка / Оверлей)"""
    return render_template('index.html')

@app.route('/admin')
def admin_page():
    """Двухпанельный судейский пульт управления"""
    return render_template('admin.html')

@app.route('/overlay')
def overlay_page():
    """Прозрачная графика для OBS студии"""
    return render_template('overlay.html')

if __name__ == '__main__':
    # Встаем на твой штатный боевой порт лиги 8000
    app.run(host='0.0.0.0', port=8000, debug=True)
