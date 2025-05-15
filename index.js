require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Check for required environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  console.error('ERROR: DISCORD_TOKEN environment variable is missing!');
  console.error('Please set your Discord bot token as an environment variable in Railway.');
  console.error('Go to your Railway project > Variables tab and add DISCORD_TOKEN=your_token_here');
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY environment variable is missing!');
  console.warn('The Gemini AI integration will not work without this key.');
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Initialize AI clients
let gemini = null;
if (GEMINI_API_KEY) {
  gemini = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Store channels where the bot should respond
const activeChannels = new Map();

// Command to configure which channels the bot should respond in
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Command to activate/deactivate the bot in a channel
  if (message.content.startsWith('!setsuna')) {
    const args = message.content.split(' ');
    const command = args[1];
    
    if (command === 'activate') {
      const model = args[2] || 'gemini'; // Default to gemini if not specified
      
      // Check if the selected model is available
      if (model === 'gemini' && !gemini) {
        message.reply('Cannot activate Gemini model: API key not configured. Please ask the bot administrator to set up the GEMINI_API_KEY.');
        return;
      }
      
      if (model === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
        message.reply('Cannot activate DeepSeek model: API key not configured. Please ask the bot administrator to set up the DEEPSEEK_API_KEY.');
        return;
      }
      
      activeChannels.set(message.channelId, {
        model: model,
        messageHistory: []
      });
      message.reply(`Bot activated in this channel using ${model} model!`);
    } else if (command === 'deactivate') {
      activeChannels.delete(message.channelId);
      message.reply('Bot deactivated in this channel!');
    } else if (command === 'status') {
      // Add a status command to check if the bot is working
      message.reply('Bot is online and functioning correctly!');
    } else {
      message.reply('Available commands: !setsuna activate [model], !setsuna deactivate, !setsuna status');
    }
    return;
  }
  
  // Check if the message is in an active channel
  const channelConfig = activeChannels.get(message.channelId);
  if (!channelConfig) return;
  
  // Get message history (last 50 messages)
  const messages = await message.channel.messages.fetch({ limit: 50 });
  const messageHistory = Array.from(messages.values())
    .reverse()
    .map(msg => ({
      role: msg.author.bot ? 'assistant' : 'user',
      content: msg.content,
      author: msg.author.username
    }));
  
  // Update channel's message history
  channelConfig.messageHistory = messageHistory;
  
  // Process with the selected AI model
  try {
    let response;
    
    if (channelConfig.model === 'gemini' && gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(messageHistory) }] }],
      });
      response = result.response.text();
    } else if (channelConfig.model === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
      // Implement DeepSeek API integration
      // This would require using fetch or axios to call the DeepSeek API
      const fetch = require('node-fetch');
      
      try {
        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messageHistory.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            max_tokens: 1000
          })
        });
        
        const data = await deepseekResponse.json();
        response = data.choices[0].message.content;
      } catch (error) {
        console.error('DeepSeek API error:', error);
        response = "Error connecting to DeepSeek API. Please try again later.";
      }
    }
    
    // Send the response
    if (response) {
      message.channel.send(response);
    } else {
      response = "The selected AI model is not available. Please contact the bot administrator.";
      message.channel.send(response);
    }
  } catch (error) {
    console.error('Error generating response:', error);
    message.channel.send('Sorry, I encountered an error while processing your request.');
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready to respond to messages!');
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('Bot is shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Connect to Discord
console.log('Connecting to Discord...');
client.login(DISCORD_TOKEN).catch(error => {
  console.error('Failed to login to Discord:', error);
  process.exit(1);
});
