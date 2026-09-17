/**
 * ====================================================================
 * 🏎️ SRO GT7 STREAM OVERLAY — MAIN ASYNCHRONOUS LOGIC ENGINE
 * ====================================================================
 * Автоматически управляет турнирной сеткой, скрывает элементы при пустом
 * лобби и плавно выкатывает градиентный баннер Fastest Lap на финише.
 */

async function refreshOverlayHUD() {
    try {
        // Опрашиваем наш Express-бэкенд на Node.js с защитой от кэширования таймстампом
        let res = await fetch('/api/data?t=' + Date.now());
        if (!res.ok) return;
        let data = await res.json();

        // Обновляем название гоночного трека в шапке HUD
        document.getElementById('track-display').innerText = data.track_name || "TRACK";

        let grid = document.getElementById('leaderboard-grid');
        let flContainer = document.getElementById('fl-card-block');

        // 🛑 ХУК ПУСТОГО ЛОББИ: Если пилотов на трассе НЕТ — мгновенно чистим экран и прячем ВСЁ
        if (!data.pilots || data.pilots.length === 0) { 
            grid.innerHTML = ""; 
            if (flContainer) {
                flContainer.innerHTML = "";
                flContainer.classList.remove('visible');
                flContainer.style.display = "none"; // Намертво вырезаем плашку ЛК
            }
            return; 
        }

        // 1. ОТРИСОВКА ОСНОВНОЙ ТАБЛИЦЫ ЛИДЕРОВ (ГОРИЗОНТАЛЬНЫЙ РЯД СТРОК)
        let htmlBuffer = "";
        data.pilots.forEach((driver) => {
            // Разделяем полное имя пилота (например, "G. LUDIS #16") на имя и бортовой номер
            let fullName = driver.pilot_name || "PILOT";
            let namePart = fullName;
            let carPart = "00";

            if (fullName.includes("#")) {
                let parts = fullName.split("#");
                namePart = parts[0].trim();
                carPart = parts[1].trim();
            }

            // Выстраиваем строку строго по утвержденному гоночному макету
            htmlBuffer += `
                <div class="pilot-card">
                    <div class="pilot-position">${driver.position || "-"}</div>
                    <div class="pilot-name">${namePart}</div>
                    <div class="pilot-car-number">#${carPart}</div>
                    <div class="pilot-laptime">${driver.best_lap || "0:00.000"}</div>
                    <div class="pilot-status-placeholder"></div>
                </div>
            `;
        });
        grid.innerHTML = htmlBuffer;

        // 2. 🟪 УПРАВЛЕНИЕ АБСОЛЮТНОЙ ВИДИМОСТЬЮ ПЛАШКИ FASTEST LAP СЕССИИ
        // Включаем отображение ТОЛЬКО если сервер разрешил баннер И время реально сдвинулось с нулей!
        if (data.fastest_lap && data.fastest_lap.show_banner && data.fastest_lap.time !== "0:00.000") {
            let flFullName = data.fastest_lap.pilot_name || "PILOT";
            let flNamePart = flFullName;
            let flCarPart = "00";

            if (flFullName.includes("#")) {
                let flParts = flFullName.split("#");
                flNamePart = flParts[0].trim();
                flCarPart = flParts[1].trim();
            }

            // Рендерим внутренности плашки строго под изолированные CSS-классы
            flContainer.innerHTML = `
                <div class="fl-badge">ЛК</div>
                <div class="pilot-name">${flNamePart}</div>
                <div class="pilot-car-number">#${flCarPart}</div>
                <div class="pilot-laptime fl-time-highlight">${data.fastest_lap.time}</div>
                <div class="pilot-status-placeholder"></div>
            `;
            
            // 🔥 ЖЕСТКИЙ ПЕРЕКЛЮЧАТЕЛЬ ЗАМКА: Переводим элемент в display: flex и запускаем плавное проявление opacity
            flContainer.classList.add('visible');
        } else {
            // 🔥 Если первого боевого ЛК еще нет (выездной круг Out-Lap или нули) — наглухо вырезаем её из разметки экрана!
            flContainer.innerHTML = "";
            flContainer.classList.remove('visible');
            flContainer.style.display = "none"; // Дублирующий жесткий замок физического скрытия
        }

    } catch (err) { 
        console.error("Сбой JS-ядра оверлея:", err); 
    }
}

// Запускаем гоночный тик обновления оверлея ровно 4 раза в секунду (каждые 250мс)
setInterval(refreshOverlayHUD, 250);

// Инициализация при первой загрузке страницы в браузере OBS
window.onload = refreshOverlayHUD;

