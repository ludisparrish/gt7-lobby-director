/**
 * ====================================================================
 * 🟪 SRO F1-STYLE SAFETY CAR MODULE — REAL-TIME SOCKET TRIGGER (STABLE)
 * ====================================================================
 */

const f1FinalScStyles = `
    .sro-f1-vsc-container {
        display: flex;
        flex-direction: column;
        font-family: 'Arial Black', sans-serif;
        text-transform: uppercase;
        box-sizing: border-box;
        width: 100%;
        z-index: 99999;
        
        height: 0px;
        opacity: 0;
        margin-bottom: 0px;
        overflow: hidden;
        transition: height 0.4s ease, opacity 0.4s ease, margin-bottom 0.4s ease;
    }

    .sro-f1-vsc-container.active {
        height: 44px;
        opacity: 1;
        margin-bottom: 5px;
    }

    .f1-vsc-top-row { height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; letter-spacing: 1px; }
    .f1-vsc-bottom-row { height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }

    /* 💛 ЧЕРНО-ЖЕЛТЫЙ РЕЖИМ (VSC ON) */
    .sro-f1-vsc-container.mode-vsc-on .f1-vsc-top-row { background: #151515 !important; color: #ffcc00 !important; }
    .sro-f1-vsc-container.mode-vsc-on .f1-vsc-bottom-row { background: #ffcc00 !important; color: #000000 !important; }

    /* 🟩 ЗЕЛЕНЫЙ РЕЖИМ РЕСТАРТА (VSC OFF) */
    .sro-f1-vsc-container.mode-vsc-off .f1-vsc-top-row { background: #004600 !important; color: #ffffff !important; }
    .sro-f1-vsc-container.mode-vsc-off .f1-vsc-bottom-row { background: #008000 !important; color: #ffffff !important; }

    .f1-vsc-blink-text { animation: sroF1TextBlink 1.2s infinite ease-in-out; }
    
    /* 🔥 ЖЕСТКИЙ ФИКС ОПЕЧАТКИ: Теперь тут строго 100% без подчеркиваний! */
    @keyframes sroF1TextBlink { 
        0%, 100% { opacity: 1; } 
        50% { opacity: 0.3; } 
    }
`;

const styleSheetNode = document.createElement("style");
styleSheetNode.innerText = f1FinalScStyles;
document.head.appendChild(styleSheetNode);

let internalScTimer = null;

function triggerF1Alert(scStatus) {
    let box = document.getElementById('sro-f1-vsc-wrapper');
    let topText = document.getElementById('f1-vsc-top-text');
    let bottomText = document.getElementById('vsc-bottom-text'); // Фикс ID под templates/overlay.html

    if (!box || !topText || !bottomText) return;

    if (internalScTimer) {
        clearTimeout(internalScTimer);
        internalScTimer = null;
    }

    // 🟪 ТУПО ПО КЛИКУ: Врубаем черно-желтый баннер инцидента
    if (scStatus === "VSC ON") {
        topText.innerText = "VIRTUAL SAFETY CAR";
        bottomText.innerText = "VSC INCIDENT";
        box.className = "sro-f1-vsc-container mode-vsc-on active";
        
        topText.className = "f1-vsc-top-row f1-vsc-blink-text";
        bottomText.className = "f1-vsc-bottom-row f1-vsc-blink-text";
    }
    
    // 🟩 ТУПО ПО КЛИКУ: Врубаем зеленый рестарт секторов на 15 секунд
    else if (scStatus === "VSC OFF") {
        topText.innerText = "VSC ENDING";
        bottomText.innerText = "RACE STARTS ON LAST SECTOR";
        box.className = "sro-f1-vsc-container mode-vsc-off active";
        
        topText.className = "f1-vsc-top-row f1-vsc-blink-text";
        bottomText.className = "f1-vsc-bottom-row f1-vsc-blink-text";

        // Ровно через 15 секунд плавно сворачиваем баннер в ноль
        internalScTimer = setTimeout(() => {
            box.classList.remove('active');
        }, 15000);
    }
    
    // 🛑 ТУПО ПО КЛИКУ: Сброс плашки маршалов мгновенно
    else {
        box.className = "sro-f1-vsc-container";
        topText.innerHTML = "";
        bottomText.innerHTML = "";
    }
}

window.triggerF1Alert = triggerF1Alert;

