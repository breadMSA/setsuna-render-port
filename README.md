# Setsuna Discord Bot

A Discord bot that connects to DeepSeek API and chats with users in specific channels.

## Features

- Connects to Discord and responds to messages in configured channels
- Integrates with DeepSeek API
- Provides context-aware responses by analyzing channel message history
- Simple channel activation/deactivation commands

## Setup
### Invite Setsuna
You can invite pre-built Setsuna to your Discord server using the following link:
[Invite Setsuna to your Discord server](https://discord.com/oauth2/authorize?client_id=1372437324595462206&permissions=1689917160152128&integration_type=0&scope=applications.commands+bot) 


For server setup tutorial, please refer to the usage below.


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

## License

MIT"# setsuna-discord-bot" 
