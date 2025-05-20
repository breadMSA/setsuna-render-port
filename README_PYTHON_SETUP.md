# Python 圖片生成設置指南

## 概述

本項目使用Python腳本與Gemini API進行圖片生成。以下是設置和運行Python部分的步驟。

## 前提條件

- Python 3.8或更高版本
- pip（Python包管理器）

## 安裝步驟

### 1. 安裝Python

#### Windows

1. 從[Python官網](https://www.python.org/downloads/windows/)下載並安裝Python
2. 安裝時勾選「Add Python to PATH」選項
3. 安裝完成後，打開命令提示符並運行 `python --version` 確認安裝成功

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3 python3-pip
python3 --version  # 確認安裝成功
```

#### Linux (CentOS/RHEL)

```bash
sudo yum install python3 python3-pip
python3 --version  # 確認安裝成功
```

### 2. 安裝Python依賴項

使用以下命令安裝所需的Python庫：

#### Windows

```bash
pip install -r python_requirements.txt
```

#### Linux

```bash
python3 -m pip install -r python_requirements.txt
```

或者手動安裝：

#### Windows

```bash
pip install google-generativeai Pillow
```

#### Linux

```bash
python3 -m pip install google-generativeai Pillow
```

### 3. 確保Node.js可以訪問Python

確保Python可執行文件在系統PATH中，這樣Node.js可以通過`child_process.exec`調用它。

#### 在部署環境中

如果您在部署環境（如Heroku、Railway等）中運行，請確保：

1. 添加適當的buildpack以支持Python
2. 設置環境變數以確保Python可用

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