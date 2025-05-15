<details>
<summary>🇹🇼 點擊展開／收合繁體中文說明</summary>

# Setsuna Discord Bot（賽茲娜 Discord 機器人）

一個能連接 DeepSeek API 並在指定頻道與用戶聊天的 Discord 機器人。

## 功能特色

- 連接 Discord 並在設定的頻道回應訊息
- 整合 DeepSeek API
- 透過分析頻道訊息歷史，提供有脈絡的回覆
- 支援簡單的頻道啟用／停用指令

## 邀請 Setsuna
你可以用以下連結邀請 Setsuna 到你的 Discord 伺服器：
[邀請 Setsuna 到你的 Discord 伺服器](https://discord.com/oauth2/authorize?client_id=1372437324595462206&permissions=1689917160152128&integration_type=0&scope=applications.commands+bot)

伺服器設定教學請參考下方使用說明。

## 安裝步驟

### 本地開發

1. 複製本專案
2. 安裝依賴：
   ```
   npm install
   ```
3. 建立 `.env` 檔案並填入 API 金鑰：
   ```
   DISCORD_TOKEN=你的 Discord bot token
   GEMINI_API_KEY=你的 Gemini API 金鑰
   DEEPSEEK_API_KEY=你的 DeepSeek API 金鑰
   ```
4. 啟動機器人：
   ```
   npm start
   ```

### GitHub 部署

1. 建立新的 GitHub repository
2. 推送程式碼：
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/setsuna-discord-bot.git
   git push -u origin main
   ```

## 24 小時部署選項

### 選項 1：Railway

[Railway](https://railway.app/) 提供簡單的雲端部署平台，有免費方案。

1. 註冊 Railway 並連接 GitHub repository
2. 在 Railway 後台新增環境變數
3. 部署你的應用程式

### 選項 2：Render

[Render](https://render.com/) 提供免費的 Web 服務主機。

1. 註冊 Render 並連接 GitHub repository
2. 建立新的 Web Service
3. 設定 build 指令為 `npm install`
4. 設定 start 指令為 `npm start`
5. 新增環境變數
6. 部署你的應用程式

### 選項 3：Heroku

[Heroku](https://www.heroku.com/) 也是常見的 Discord bot 雲端主機。

1. 註冊 Heroku 並安裝 Heroku CLI
2. 在專案根目錄建立 `Procfile`，內容如下：
   ```
   worker: npm start
   ```
3. 部署到 Heroku：
   ```
   heroku create
   git push heroku main
   ```
4. 在 Heroku 後台新增環境變數
5. 啟動 worker：
   ```
   heroku ps:scale worker=1
   ```

### 選項 4：GitHub Actions + 自架 Runner

如果你有 24 小時運作的主機：

1. 設定 GitHub Actions workflow（`.github/workflows/deploy.yml`）：
   ```yaml
   name: Deploy Bot
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: self-hosted
       steps:
         - uses: actions/checkout@v2
         - name: Use Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16.x'
         - run: npm ci
         - run: pm2 restart setsuna || pm2 start index.js --name setsuna
   ```
2. 在主機安裝 PM2：`npm install -g pm2`
3. 設定自架 GitHub Actions runner
4. 推送到 GitHub 觸發部署

## 使用方法

機器人啟動後，你可以在 Discord 伺服器使用以下指令：

- `/setsuna activate #頻道名稱` - 在指定頻道啟用機器人
- `/setsuna deactivate #頻道名稱` - 在指定頻道停用機器人
- 若不指定 #頻道名稱，則預設為當前頻道

- `/contact` - 聯絡機器人擁有者或加入社群伺服器提供回饋、獲得支援
- `/help` - 查看機器人使用說明

## 授權條款

MIT

</details>

<details>
<summary>🇺🇸 Click to expand/collapse English instructions</summary>

# Setsuna Discord Bot

A Discord bot that connects to DeepSeek API and chats with users in specific channels.

## Features

- Connects to Discord and responds to messages in configured channels
- Integrates with DeepSeek API
- Provides context-aware responses by analyzing channel message history
- Simple channel activation/deactivation commands

## Invite Setsuna
You can invite pre-built Setsuna to your Discord server using the following link:
[Invite Setsuna to your Discord server](https://discord.com/oauth2/authorize?client_id=1372437324595462206&permissions=1689917160152128&integration_type=0&scope=applications.commands+bot) 

For server setup tutorial, please refer to the usage below.

## Setup

### Local Development

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your API keys:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   ```
4. Run the bot:
   ```
   npm start
   ```

### GitHub Setup

1. Create a new GitHub repository
2. Push your code to the repository:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/setsuna-discord-bot.git
   git push -u origin main
   ```

## Deployment Options for 24/7 Operation

### Option 1: Railway

[Railway](https://railway.app/) offers a simple deployment platform with a free tier.

1. Sign up for Railway and connect your GitHub repository
2. Add your environment variables in the Railway dashboard
3. Deploy your application

### Option 2: Render

[Render](https://render.com/) provides a free tier for web services.

1. Sign up for Render and connect your GitHub repository
2. Create a new Web Service
3. Set the build command to `npm install`
4. Set the start command to `npm start`
5. Add your environment variables
6. Deploy your application

### Option 3: Heroku

[Heroku](https://www.heroku.com/) is another popular option for hosting Discord bots.

1. Sign up for Heroku and install the Heroku CLI
2. Create a `Procfile` in your project root with the content:
   ```
   worker: npm start
   ```
3. Deploy to Heroku:
   ```
   heroku create
   git push heroku main
   ```
4. Add your environment variables in the Heroku dashboard
5. Scale your worker dyno:
   ```
   heroku ps:scale worker=1
   ```

### Option 4: GitHub Actions + Self-hosted Runner

If you have a server or computer that can run 24/7:

1. Set up a GitHub Actions workflow file (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy Bot
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: self-hosted
       steps:
         - uses: actions/checkout@v2
         - name: Use Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16.x'
         - run: npm ci
         - run: pm2 restart setsuna || pm2 start index.js --name setsuna
   ```
2. Install PM2 on your server: `npm install -g pm2`
3. Set up a self-hosted GitHub Actions runner on your server
4. Push to GitHub to trigger the deployment

## Usage

Once the bot is running, you can use the following commands in your Discord server:

- `/setsuna activate #channel-name` - Activate the bot in designated channel.
- `/setsuna deactivate #channel-name` - Deactivate the bot in the current channel
- Leave #channel-name empty if you want to activate/deactivate the bot in the current channel.

- `/contact` - Contact the bot owner or join our community server to send feedback, get support, and hang out with us.
- `/help` - Get help on how to use the bot.

## License

MIT

</details>
