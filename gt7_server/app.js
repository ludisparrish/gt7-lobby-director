const express = require('express');
const path = require('path');
const app = express();

// 🔥 ЖЕСТКАЯ СИНХРОНИЗАЦИЯ: Импортируем строго из нижнего регистра!
const telemetryRouter = require('./api/telemetry'); 

// Настраиваем Express на чтение JSON
app.use(express.json());

// Открываем статику
app.use('/static', express.static(path.join(__dirname, 'static')));

// 🔥 РЕГИСТРИРУЕМ СИНХРОНИЗИРОВАННЫЙ МОДУЛЬ МИДЛВАРИ
app.use(telemetryRouter);

// Настройка путей для рендеринга шаблонов
app.get('/overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'overlay.html'));
});

// Занимаем боевой гоночный порт лиги 8000!
const PORT = 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(` SRO Express Race Control active on port ${PORT}`);
});
