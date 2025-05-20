# Python 圖片生成設置指南

## 概述

本項目使用Python腳本與Gemini API進行圖片生成。以下是設置和運行Python部分的步驟。

## 前提條件

- Python 3.8或更高版本
- pip（Python包管理器）

## 安裝步驟

1. **安裝Python依賴項**

   使用以下命令安裝所需的Python庫：

   ```bash
   pip install -r python_requirements.txt
   ```

   或者手動安裝：

   ```bash
   pip install google-generativeai Pillow
   ```

2. **確保Node.js可以訪問Python**

   確保Python可執行文件在系統PATH中，這樣Node.js可以通過`child_process.exec`調用它。

## 故障排除

如果遇到問題，請檢查：

1. **Python路徑**：確保Python已正確安裝並添加到系統PATH中。

   可以通過運行以下命令來測試：

   ```bash
   python --version
   ```

2. **依賴項安裝**：確保所有Python依賴項都已正確安裝。

   可以通過運行以下命令來測試：

   ```bash
   python -c "import google.generativeai; import PIL; print('Dependencies installed successfully!')"
   ```

3. **API密鑰**：確保在.env文件中設置了有效的Gemini API密鑰。

## 如何工作

當用戶發送包含圖片生成關鍵詞的消息時，Discord機器人會：

1. 調用`generate_image.py`腳本
2. 將用戶的提示和API密鑰傳遞給腳本
3. Python腳本使用Gemini API生成圖片
4. 腳本返回包含圖片數據和文本的JSON
5. Discord機器人將圖片發送回用戶

## 自定義

如果需要修改圖片生成行為，可以編輯`generate_image.py`文件。