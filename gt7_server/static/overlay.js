async function refreshOverlayHUD() {
    try {
        let res = await fetch('/api/data?t=' + Date.now());
        if (!res.ok) return;
        let data = await res.json();

        document.getElementById('track-display').innerText = data.track_name || "TRACK";

        let grid = document.getElementById('leaderboard-grid');
        let flContainer = document.getElementById('fl-card-block');

        if (!data.pilots || data.pilots.length === 0) { 
            grid.innerHTML = ""; 
            if (flContainer) {
                flContainer.innerHTML = "";
                flContainer.classList.remove('visible');
                flContainer.style.display = "none";
            }
            return; 
        }

        // 1. ОТРИСОВКА ТАБЛИЦЫ С УЧЕТОМ НОВЫХ КЛАССОВ СТАТУСА PIT / OUT
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

            // Динамически определяем CSS класс для правой заглушки на основе ответа сервера
            let statusClass = "mode-delta";
            if (driver.ui_mode === "PIT") statusClass = "mode-pit";
            if (driver.ui_mode === "OUT") statusClass = "mode-out";

            htmlBuffer += `
                <div class="pilot-card">
                    <div class="pilot-position">${driver.position || "-"}</div>
                    <div class="pilot-name">${namePart}</div>
                    <div class="pilot-car-number">#${carPart}</div>
                    <div class="pilot-laptime">${driver.best_lap || "0:00.000"}</div>
                    <!-- 🔥 СЮДА ДИНАМИЧЕСКИ ВШИВАЕТСЯ БЭДЖ СТАТУСА И ЕГО ЦВЕТ! -->
                    <div class="pilot-status-placeholder ${statusClass}">${driver.badge_text || ""}</div>
                </div>
            `;
        });
        grid.innerHTML = htmlBuffer;

        // 2. РЕНДЕРИНГ ГРАДИЕНТНОЙ ПЛАШКИ FASTEST LAP
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
            flContainer.classList.add('visible');
        } else {
            flContainer.innerHTML = "";
            flContainer.classList.remove('visible');
            flContainer.style.display = "none";
        }

    } catch (err) { 
        console.error("Сбой JS-ядра оверлея:", err); 
    }
}

setInterval(refreshOverlayHUD, 250);
window.onload = refreshOverlayHUD;


