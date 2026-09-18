# 🏎️ SRO GT7 Race Control & Telemetry System

**A professional eSports race coordination center and telemetry broadcasting system designed for Gran Turismo Leagues.**

This suite automates marshalling, renders transparent broadcast graphics for OBS Studio, and features an interactive Race Control panel integrated with Virtual Safety Car (VSC) workflow automation.

---

## 🛠️ System Architecture

The project is split into two independent nodes that communicate seamlessly via secure JSON API network gateways:

1. **Mac Launcher (Client):** A native desktop application built with Python (`PyQt6`). It listens to the UDP telemetry stream from the PlayStation 5 console, parses raw data bytes using hardware memory offsets, calculates personal records via a local `BestLapManager`, formats the timing metrics, and instantly pushes payloads to the server.
2. **Flask Server (VPS Backend):** Receives client payloads directly into volatile memory (RAM), manages race control flag states, processes pit lane animation dampening filters, and serves clean JSON data for dynamic frontend rendering.

---

## 🚀 Key Features & Functionality

*   **📺 Horizontal Overlay (OBS HUD):** A transparent web HUD with a width of 620px optimized for live streams. It lines up drivers in a single, non-breaking horizontal row: `[Position] Pilot Name Number | Lap Time | Pit Time | Status`. Row elements smoothly interpolate their grid positions on the fly during overtakes based on hardware console updates.
*   **⏱️ Smart Pit Lane Dampening:** Immune to Gran Turismo 7's tire/fuel service animation flag jitter. When the console momentarily glitches during pit stops and reports fake track markers, the server locks the state. Exiting the boxes is only confirmed after 5 seconds of consecutive track status packets, after which a green `TRACK` badge lights up for 10 seconds, while the total pit timer safely pauses on the screen.
*   **🟪 Autonomous Session Fastest Lap:** The server dynamically scans the `SESSION_BEST_LAPS` cache on the fly to find the absolute record of the lobby. It automatically fires up a purple neon `FL` banner with the fastest driver's name, car number, and a cyan lap time clock.
*   **⚠️ Virtual Safety Car (VSC) Workflow:** A complete race control automation system. The commentator or race steward can trigger the `SC ON` mode with a single button from the split-screen admin panel. Drivers are instantly notified on the portal or launcher and must comply with the league's speed regulation. Cleared or disabled states (`CLEAR` / `OFF`) are also fully controlled via the panel.
*   **🛑 AFK & Disconnect Detector:** If a driver is stuck in the garage for more than 120 seconds or the console returns a hard exit code (`pit_state == -1`), the overlay natively dims the driver's row opacity and displays a grey `AFK` status badge.


---
⭐ **SRO Systems Active. Engineered explicitly for the competitive racing championships of the ФАЛ / LMF league.**
