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

#### 使用虛擬環境（推薦方式，特別是在Debian/Ubuntu系統）

在某些Linux系統（特別是Debian/Ubuntu）中，Python環境是「externally managed」的，這意味著您需要使用虛擬環境來安裝Python包。

```bash
# 創建虛擬環境
python3 -m venv .venv

# 激活虛擬環境
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate    # Windows

# 安裝依賴項
pip install -r python_requirements.txt
```

#### 直接安裝（如果您的系統允許）

##### Windows

```bash
pip install -r python_requirements.txt
```

##### Linux

```bash
python3 -m pip install -r python_requirements.txt
```

或者手動安裝：

##### Windows

```bash
pip install google-generativeai Pillow
```

##### Linux

```bash
python3 -m pip install google-generativeai Pillow
```

### 3. 確保Node.js可以訪問Python

確保Python可執行文件在系統PATH中，這樣Node.js可以通過`child_process.exec`調用它。

#### 在部署環境中

##### Railway 部署

Railway使用基於Debian的容器，其Python環境是「externally managed」的。我們已經配置了必要的文件來處理這個問題：

1. **虛擬環境設置**：
   - `nixpacks.toml` 和 `railway.json` 文件已配置為在部署期間創建Python虛擬環境
   - 依賴項會使用 `.venv/bin/pip` 安裝到這個虛擬環境中

2. **環境變數**：
   - PATH 已擴展以包含虛擬環境的bin目錄
   - PYTHONPATH 已設置為包含應用程序根目錄

3. **診斷**：
   - 如果遇到Python相關問題，運行診斷腳本：
     ```
     npm run check-python
     ```
   - 這將提供有關您的Python環境的詳細信息

##### Heroku 部署

如果您在Heroku中運行，請確保：

1. 添加適當的buildpack以支持Node.js和Python
   - 我們的 `app.json` 文件已經配置了這些buildpack

2. 設置環境變數以確保Gemini API密鑰和Discord令牌可用

3. Python版本：
   - `runtime.txt` 文件指定了要使用的Python版本

## 故障排除

### 常見問題

1. **Python路徑**：確保Python已正確安裝並添加到系統PATH中。

   可以通過運行以下命令來測試：

   ```bash
   python --version
   # 或
   python3 --version
   ```

2. **依賴項安裝**：確保所有Python依賴項都已正確安裝。

   可以通過運行以下命令來測試：

   ```bash
   python -c "import google.generativeai; import PIL; print('Dependencies installed successfully!')"
   # 或
   python3 -c "import google.generativeai; import PIL; print('Dependencies installed successfully!')"
   ```

3. **API密鑰**：確保在.env文件中設置了有效的Gemini API密鑰。

### 特定錯誤處理

#### "externally-managed-environment" 錯誤

如果您看到以下錯誤：

```
error: externally-managed-environment
× This environment is externally managed
```

這表示您的Python環境由系統包管理器管理，不允許直接使用pip安裝包。解決方法：

1. **創建並使用虛擬環境**：

   ```bash
   # 安裝虛擬環境包（如果需要）
   sudo apt install python3-venv python3-full
   
   # 創建虛擬環境
   python3 -m venv .venv
   
   # 激活虛擬環境
   source .venv/bin/activate
   
   # 安裝依賴項
   pip install -r python_requirements.txt
   ```

2. **使用虛擬環境中的Python解釋器**：

   確保在運行腳本時使用虛擬環境中的Python解釋器：
   
   ```bash
   .venv/bin/python generate_image.py "your prompt" "your_api_key"
   ```

#### Python命令未找到

如果系統找不到Python命令，請嘗試：

1. **檢查Python安裝**：
   ```bash
   which python3
   # 或
   which python
   ```

2. **運行診斷腳本**：
   ```bash
   npm run check-python
   ```

3. **檢查日誌**：查看應用程序日誌中的詳細調試信息，這些信息會顯示嘗試執行的Python命令和路徑。

## 如何工作

當用戶發送包含圖片生成關鍵詞的消息時，Discord機器人會：

1. 調用`generate_image.py`腳本
2. 將用戶的提示和API密鑰傳遞給腳本
3. Python腳本使用Gemini API生成圖片
4. 腳本返回包含圖片數據和文本的JSON
5. Discord機器人將圖片發送回用戶

## 自定義

如果需要修改圖片生成行為，可以編輯`generate_image.py`文件。