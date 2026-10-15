"""测试 screenshot_worker 是否能正常执行"""
import subprocess
import sys

cmd = [
    sys.executable,
    "app/services/screenshot_worker.py",
    "static/mindmaps/test_markmap.html",
    "static/mindmaps/test_worker_output.png",
    "1920",
    "1080"
]

print(f"执行命令: {' '.join(cmd)}")
result = subprocess.run(cmd, capture_output=True, text=True)
print(f"返回码: {result.returncode}")
print(f"stdout:\n{result.stdout}")
print(f"stderr:\n{result.stderr}")
