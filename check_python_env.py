#!/usr/bin/env python3

import sys
import os
import platform
import subprocess
import json

def get_environment_info():
    """獲取環境信息用於調試"""
    env_info = {
        "python_version": sys.version,
        "platform": platform.platform(),
        "python_executable": sys.executable,
        "current_dir": os.getcwd(),
        "script_dir": os.path.dirname(os.path.abspath(__file__)),
        "env_vars": {k: v for k, v in os.environ.items() if k.startswith(('PYTHON', 'PATH', 'VIRTUAL_ENV'))}
    }
    
    # 嘗試獲取pip列表
    try:
        pip_list = subprocess.check_output([sys.executable, '-m', 'pip', 'list'], text=True)
        env_info["pip_list"] = pip_list
    except Exception as e:
        env_info["pip_list_error"] = str(e)
    
    # 檢查虛擬環境
    env_info["virtual_env"] = os.environ.get("VIRTUAL_ENV", "Not in a virtual environment")
    
    # 檢查Python路徑
    try:
        which_python = subprocess.check_output("which python || which python3 || echo 'Not found'", shell=True, text=True).strip()
        env_info["which_python"] = which_python
    except Exception as e:
        env_info["which_python_error"] = str(e)
    
    # 檢查是否可以導入必要的庫
    try:
        import google.generativeai
        env_info["google_generativeai"] = "Installed"
        env_info["google_generativeai_version"] = google.generativeai.__version__
    except ImportError as e:
        env_info["google_generativeai"] = f"Not installed: {str(e)}"
    
    try:
        from PIL import Image
        env_info["pillow"] = "Installed"
        env_info["pillow_version"] = Image.__version__
    except ImportError as e:
        env_info["pillow"] = f"Not installed: {str(e)}"
    
    return env_info

def main():
    # 獲取環境信息
    env_info = get_environment_info()
    
    # 輸出JSON結果
    print(json.dumps(env_info, indent=2))
    
    # 檢查虛擬環境目錄
    venv_paths = [
        ".venv",
        "./.venv",
        "/app/.venv"
    ]
    
    print("\nChecking virtual environment directories:")
    for venv_path in venv_paths:
        if os.path.exists(venv_path):
            print(f"✓ {venv_path} exists")
            # 檢查Python解釋器
            python_path = os.path.join(venv_path, "bin", "python")
            if os.path.exists(python_path):
                print(f"  ✓ {python_path} exists")
                try:
                    version = subprocess.check_output([python_path, "--version"], text=True).strip()
                    print(f"  ✓ Version: {version}")
                except Exception as e:
                    print(f"  ✗ Error getting version: {str(e)}")
            else:
                print(f"  ✗ {python_path} does not exist")
        else:
            print(f"✗ {venv_path} does not exist")

if __name__ == "__main__":
    main()