/**
 * ====================================================================
 * 🏎️ SRO GT7 STREAM OVERLAY — MAIN LOGIC ENGINE (ULTRA-SMOOTH VER.)
 * ====================================================================
 */

// Помощник для плавной смены текста без резких прыжков букв на экране
function smoothSetText(elementId, newText) {
    let el = document.getElementById(elementId);
    if (!el) return;
    
    // Если текст совпадает, ничего не трогаем
    if (el.innerText === newText) return;
    
    // 1. Плавно гасим элемент в ноль
    el.style.opacity = "0";
    
    // 2. Спустя 150мс (когда элемент стал невидимым), меняем текст и плавно зажигаем обратно
    setTimeout(() => {
        el.innerText = newText;
        el.style.opacity = "1";
    }, 150);
}

async function refreshOverlayHUD() {
    try {
        let res = await fetch('/api/data?t=' + Date.now());
        if (!res.ok) return;
        let data = await res.json();

        // 🔥 ПЛАВНЫЙ СМЕННЫЙ ВЫВОД ТЕКСТА ШАПКИ СЕССИИ И ТРЕКА
        smoothSetText('track-display', data.track_name || "TRACK");
        smoothSetText('laps-display', data.session_mode || "PRACTICE");

        let grid = document.getElementById('leaderboard-grid');
        let flContainer = document.getElementById('fl-card-block');

        // Если лобби пустое — плавно гасим сетку лидеров и ЛК плашку
        if (!data.pilots || data.pilots.length === 0) { 
            grid.style.opacity = "0";
            if (flContainer) {
                flContainer.classList.remove('visible');
            }
            setTimeout(() => { if (!data.pilots || data.pilots.length === 0) grid.innerHTML = ""; }, 400);
            return; 
        }
        
        grid.style.opacity = "1";

        // 1. ОТРИСОВКА ТАБЛИЦЫ С УЧЕТОМ ЭФФЕКТОВ TRANSITION ДЛЯ СДВИГОВ ПОЗИЦИЙ
        let htmlBuffer = "";
        data.pilots.forEach((driver) => {
            let fullName = driver.pilot_name || "PILOT";
            let namePart = fullName;
            let carPart = "00";

            if (fullName.includes("#")) {
                let parts = fullName.split("#");
                namePart = parts[0].trim();
                carPart = parts[1].trim();
            }

            let statusClass = "mode-delta";
            if (driver.ui_mode === "PIT") statusClass = "mode-pit";
            if (driver.ui_mode === "OUT") statusClass = "mode-out";

            htmlBuffer += `
                <div class="pilot-card">
                    <div class="pilot-position">${driver.position || "-"}</div>
                    <div class="pilot-name">${namePart}</div>
                    <div class="pilot-car-number">#${carPart}</div>
                    <div class="pilot-laptime">${driver.best_lap || "0:00.000"}</div>
                    <div class="pilot-status-placeholder ${statusClass}">${driver.badge_text || ""}</div>
                </div>
            `;
        });
        
        // Перезаписываем буфер. CSS автоматически сгладит перестроение строк!
        grid.innerHTML = htmlBuffer;

        // 2. 🟪 УПРАВЛЕНИЕ АБСОЛЮТНОЙ ВИДИМОСТЬЮ ПЛАШКИ FASTEST LAP
        if (data.fastest_lap && data.fastest_lap.show_banner && data.fastest_lap.time !== "0:00.000") {
            let flFullName = data.fastest_lap.pilot_name || "PILOT";
            let flNamePart = flFullName;
            let flCarPart = "00";

            if (flFullName.includes("#")) {
                let flParts = flFullName.split("#");
                flNamePart = flParts[0].trim();
                flCarPart = flParts[1].trim();
            }

            flContainer.innerHTML = `
                <div class="fl-badge">ЛК</div>
                <div class="pilot-name">${flNamePart}</div>
                <div class="pilot-car-number">#${flCarPart}</div>
                <div class="pilot-laptime fl-time-highlight">${data.fastest_lap.time}</div>
                <div class="pilot-status-placeholder"></div>
            `;
            
            // Активируем класс: плашка плавно развернется по высоте и выплывет из прозрачности!
            flContainer.classList.add('visible');
        } else {
            // Плавное схлопывание и затухание рекорда
            flContainer.classList.remove('visible');
        }

    } catch (err) { 
        console.error("Сбой JS-ядра оверлея:", err); 
    }
}

// Запускаем гоночный тик обновления оверлея 4 раза в секунду
setInterval(refreshOverlayHUD, 250);
window.onload = refreshOverlayHUD;




