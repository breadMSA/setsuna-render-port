from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import base64
import json
import sys

def generate_image(prompt, api_key):
    try:
        # 初始化Gemini客戶端
        client = genai.Client(api_key=api_key)
        
        # 發送請求到Gemini API
        response = client.models.generate_content(
            model="gemini-2.0-flash-preview-image-generation",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE']
            )
        )
        
        # 初始化結果變量
        result = {
            "success": False,
            "error": None,
            "text": None,
            "image_data": None,
            "mime_type": None
        }
        
        # 處理響應
        for part in response.candidates[0].content.parts:
            if part.text is not None:
                result["text"] = part.text
            elif part.inline_data is not None:
                # 獲取圖片數據和MIME類型
                result["image_data"] = base64.b64encode(part.inline_data.data).decode('utf-8')
                result["mime_type"] = part.inline_data.mime_type
        
        # 檢查是否成功獲取圖片
        if result["image_data"] is not None:
            result["success"] = True
        else:
            result["error"] = "No image data in response"
            
        return result
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": None,
            "image_data": None,
            "mime_type": None
        }

def main():
    # 從命令行參數獲取prompt和API密鑰
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments. Usage: python generate_image.py 'prompt' 'api_key'"}), flush=True)
        return
    
    prompt = sys.argv[1]
    api_key = sys.argv[2]
    
    # 生成圖片
    result = generate_image(prompt, api_key)
    
    # 輸出JSON結果
    print(json.dumps(result), flush=True)

if __name__ == "__main__":
    main()