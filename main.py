import sys
from PyQt6.QtWidgets import QApplication
from modules.ui_window import LauncherWindow

if __name__ == "__main__":
    app = QApplication(sys.argv)
    ex = LauncherWindow()
    ex.show()
    sys.exit(app.exec())
