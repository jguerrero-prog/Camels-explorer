"""
Desktop launcher for CAMELS Explorer.

Wraps the existing Streamlit server (app.py/backend.py, unchanged) in a
native window via pywebview - no browser tab, no manual `streamlit run`.
"""

from __future__ import annotations

import socket
import subprocess
import sys
import time
from pathlib import Path

import webview

APP_FILE = Path(__file__).parent / "app.py"
HOST = "localhost"


class StreamlitServer:
    """Owns the lifecycle of a background `streamlit run` subprocess."""

    def __init__(self, app_file: Path, port: int):
        self.app_file = app_file
        self.port = port
        self._process: subprocess.Popen | None = None

    @property
    def url(self) -> str:
        return f"http://{HOST}:{self.port}"

    def start(self, timeout: float = 15.0) -> None:
        self._process = subprocess.Popen(
            [sys.executable, "-m", "streamlit", "run", str(self.app_file),
             "--server.headless=true", f"--server.port={self.port}",
             f"--server.address={HOST}", "--browser.gatherUsageStats=false"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self._wait_until_ready(timeout)

    def _wait_until_ready(self, timeout: float) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
                if probe.connect_ex((HOST, self.port)) == 0:
                    return
            time.sleep(0.2)
        raise TimeoutError(f"Streamlit server did not start within {timeout}s")

    def stop(self) -> None:
        if self._process is not None:
            self._process.terminate()
            self._process.wait(timeout=5)


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((HOST, 0))
        return sock.getsockname()[1]


def main() -> None:
    server = StreamlitServer(APP_FILE, port=_find_free_port())
    server.start()
    try:
        webview.create_window("CAMELS Explorer", server.url, width=1280, height=860)
        webview.start()
    finally:
        server.stop()


if __name__ == "__main__":
    main()
