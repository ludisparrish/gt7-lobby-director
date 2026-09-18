/**
 * ====================================================================
 * 🏎️ SRO GT7 EXPRESS + SOCKET.IO SERVER MONOLITH ENGINE
 * ====================================================================
 * Главное ядро гоночной экосистемы. Управляет раздачей страниц,
 * телеметрией пилотов и реактивными сокет-каналами судейства.
 */

const express = require('express');
const path = require('path');
const app = express();

// СВЯЗЫВАЕМ EXPRESS С СЕТЕВЫМ КАНАЛОМ HTTP ДЛЯ РАБОТЫ SOCKET.IO
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Послушно подключаем парсер входящего JSON от Mac-лаунчера
app.use(express.json());

// Открываем сетевой шлюз статики для плавных CSS, JS и картинок
app.use('/static', express.static(path.join(__dirname, 'static')));

// Делаем объект сокетов доступным внутри нашего файла роутера телеметрии
app.set('socketio', io);

/* ====================================================================
   📺 ГЛАВНЫЕ ВЕБ-МАРШРУТЫ РАЗДАЧИ ИНТЕРФЕЙСОВ (HTML СТРАНИЦЫ)
   ==================================================================== */

// 1. Главный неоновый экран управления SRO (корень сайта)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// 2. Твой оригинальный боевой веб-оверлей трансляции под OBS Studio
app.get('/overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'overlay.html'));
});

// 3. Твой новый двухблочный судейский пульт управления (Админка)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'admin.html'));
});

// 4. 📱 Твой новый изолированный мобильный тач-пульт маршала (70/30)
app.get('/vsc', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'vsc.html'));
});

/* ====================================================================
   📥 ПОДКЛЮЧЕНИЕ СЕТЕВОГО РОУТЕРА ТЕЛЕМЕТРИИ (API СЕТЬ)
   ==================================================================== */
const telemetryRouter = require('./api/telemetry'); 
app.use(telemetryRouter);

/* ====================================================================
   🔮 МГНОВЕННЫЙ SOCKET.IO МОСТ МЕЖДУ АДМИНКОЙ, ТЕЛЕФОНОМ И ОВЕРЛЕЯМИ
   ==================================================================== */
io.on('connection', (socket) => {
    console.log('📡 OBS-стрим, Админка или Телефон маршала подключились к сокет-каналу SRO');

    // 🔥 СУДЕЙСКИЙ ШЛЮЗ SAFETY CAR: Ловим команду VSC ON / OFF / СБРОС с любого устройства
    socket.on('admin-sc-command', (status) => {
        console.log(`🚨 Сокет-Команда Safety Car: ${status}`);
        // МГНОВЕННО пушим её вообще ВСЕМ, включая оверлей OBS и мобильный телефон!
        io.emit('server-sc-broadcast', status);
    });

    // 🔥 СЕССИОННЫЙ ШЛЮЗ: Ловим команду смены режима заезда (Практика, Квала, Гонка)
    socket.on('admin-mode-command', (mode) => {
        console.log(`📋 Сокет-Команда смены сессии -> ${mode}`);
        // МГНОВЕННО транслируем режим во все оверлеи OBS на стриме
        io.emit('server-mode-broadcast', mode);
    });

    // Обработка отключения клиентов от сети сервера
    socket.on('disconnect', () => {
        console.log('🔌 Клиент отключился от сокет-канала SRO');
    });
});

// Поднимаем гоночный мостик Express + Socket.io на твоем порту
const PORT = 8000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`🏎️ SRO Express + Socket.io Server успешно запущен на порту ${PORT}`);
});

