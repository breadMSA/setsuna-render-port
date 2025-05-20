#!/usr/bin/env python3

import sys
import json
import base64
import traceback
import os
import platform
import subprocess
from io import BytesIO

# 版本和環境信息
PYTHON_VERSION = sys.version
SYS_PATH = sys.path
PLATFORM_INFO = platform.platform()
PYTHON_EXECUTABLE = sys.executable

# 定義結果模板
RESULT_TEMPLATE = {
    "success": False,
    "error": None,
    "text": None,
    "image_data": None,
    "mime_type": None,
    "debug_info": {}
}

def log_error(message):
    """記錄錯誤到標準錯誤輸出"""
    sys.stderr.write(f"ERROR: {message}\n")
    sys.stderr.flush()
    
def get_environment_info():
    """獲取環境信息用於調試"""
    env_info = {
        "python_version": PYTHON_VERSION,
        "platform": PLATFORM_INFO,
        "python_executable": PYTHON_EXECUTABLE,
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
        
    return env_info

def generate_image(prompt, api_key):
    result = RESULT_TEMPLATE.copy()
    
    # 獲取詳細的環境信息用於調試
    result["debug_info"] = get_environment_info()
    
    # 記錄開始生成圖片
    log_error(f"Starting image generation with prompt: {prompt[:30]}...")
    
    try:
        # 嘗試導入必要的庫
        import_errors = []
        try:
            log_error("Attempting to import google.genai...")
            from google import genai
            log_error("Successfully imported google.genai")
            
            log_error("Attempting to import google.genai.types...")
            from google.genai import types
            log_error("Successfully imported google.genai.types")
            
            result["debug_info"]["imports"] = "success"
        except ImportError as e:
            error_msg = f"Failed to import required libraries: {str(e)}"
            log_error(error_msg)
            import_errors.append(str(e))
            
            # 嘗試安裝缺失的庫
            try:
                log_error("Attempting to install missing packages...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", "google-generativeai", "--upgrade"])
                log_error("Package installation completed, trying import again...")
                
                from google import genai
                from google.genai import types
                log_error("Successfully imported after installation")
                result["debug_info"]["imports"] = "success_after_install"
            except Exception as install_error:
                error_msg = f"Failed to install required libraries: {str(install_error)}"
                log_error(error_msg)
                result["error"] = error_msg
                result["debug_info"]["imports"] = f"failed: {', '.join(import_errors)}"
                result["debug_info"]["install_error"] = str(install_error)
                return result
        
        try:
            # 初始化Gemini客戶端
            log_error("Initializing Gemini client...")
            client = genai.Client(api_key=api_key)
            log_error("Gemini client initialized successfully")
            
            # 發送請求到Gemini API
            log_error("Sending request to Gemini API...")
            response = client.models.generate_content(
                model="gemini-2.0-flash-preview-image-generation",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=['TEXT', 'IMAGE']
                )
            )
            log_error("Received response from Gemini API")
            
            # 處理響應
            if not response:
                result["error"] = "Empty response from Gemini API"
                log_error("Empty response from Gemini API")
                return result
                
            if not response.candidates:
                result["error"] = "No candidates in response"
                log_error("No candidates in response")
                return result
                
            if not response.candidates[0].content.parts:
                result["error"] = "No content parts in response"
                log_error("No content parts in response")
                return result
            
            log_error(f"Processing {len(response.candidates[0].content.parts)} content parts...")
            
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'text') and part.text is not None:
                    result["text"] = part.text
                    log_error(f"Found text: {part.text[:30]}...")
                elif hasattr(part, 'inline_data') and part.inline_data is not None:
                    # 獲取圖片數據和MIME類型
                    result["image_data"] = base64.b64encode(part.inline_data.data).decode('utf-8')
                    result["mime_type"] = part.inline_data.mime_type
                    log_error(f"Found image with MIME type: {part.inline_data.mime_type}")
            
            # 檢查是否成功獲取圖片
            if result["image_data"] is not None:
                result["success"] = True
                log_error("Image generation successful")
            else:
                result["error"] = "No image data in response"
                log_error("No image data found in response")
                
            return result
            
        except Exception as api_error:
            error_msg = f"Gemini API error: {str(api_error)}"
            log_error(error_msg)
            result["error"] = error_msg
            result["debug_info"]["api_error"] = str(api_error)
            result["debug_info"]["api_error_traceback"] = traceback.format_exc()
            return result
    
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        log_error(error_msg)
        result["error"] = error_msg
        result["debug_info"]["unexpected_error"] = str(e)
        result["debug_info"]["unexpected_error_traceback"] = traceback.format_exc()
        return result

def main():
    # 記錄腳本啟動信息
    log_error(f"Script started with Python {PYTHON_VERSION} on {PLATFORM_INFO}")
    log_error(f"Arguments: {sys.argv}")
    
    # 初始化結果
    result = RESULT_TEMPLATE.copy()
    result["debug_info"] = get_environment_info()
    
    # 從命令行參數獲取prompt和API密鑰
    if len(sys.argv) < 3:
        error_msg = "Missing arguments. Usage: python generate_image.py 'prompt' 'api_key'"
        log_error(error_msg)
        result["error"] = error_msg
        print(json.dumps(result), flush=True)
        return
    
    try:
        prompt = sys.argv[1]
        api_key = sys.argv[2]
        
        log_error(f"Received prompt: {prompt[:30]}... and API key: {api_key[:5]}...")
        
        # 檢查當前目錄和文件權限
        try:
            cwd = os.getcwd()
            log_error(f"Current working directory: {cwd}")
            script_dir = os.path.dirname(os.path.abspath(__file__))
            log_error(f"Script directory: {script_dir}")
            
            # 檢查文件權限
            script_path = os.path.abspath(__file__)
            log_error(f"Script path: {script_path}")
            if os.path.exists(script_path):
                try:
                    permissions = oct(os.stat(script_path).st_mode)[-3:]
                    log_error(f"Script permissions: {permissions}")
                except Exception as perm_error:
                    log_error(f"Error checking script permissions: {str(perm_error)}")
        except Exception as dir_error:
            log_error(f"Error checking directories: {str(dir_error)}")
        
        # 生成圖片
        log_error("Calling generate_image function...")
        result = generate_image(prompt, api_key)
        log_error(f"generate_image function returned with success={result['success']}")
        
        # 輸出JSON結果
        log_error("Outputting JSON result...")
        print(json.dumps(result), flush=True)
        log_error("JSON output complete")
        
    except Exception as e:
        error_msg = f"Script execution error: {str(e)}"
        log_error(error_msg)
        log_error(f"Error traceback: {traceback.format_exc()}")
        
        result["success"] = False
        result["error"] = error_msg
        result["debug_info"]["main_error"] = str(e)
        result["debug_info"]["main_traceback"] = traceback.format_exc()
        
        print(json.dumps(result), flush=True)

if __name__ == "__main__":
    main()