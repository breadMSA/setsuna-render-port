require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
      activeChannels.set(message.channelId, {
        model: args[2] || 'gemini', // Default to gemini if not specified
        messageHistory: []
      });
      message.reply('Bot activated in this channel!');
    } else if (command === 'deactivate') {
      activeChannels.delete(message.channelId);
      message.reply('Bot deactivated in this channel!');
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
    
    if (channelConfig.model === 'gemini') {
      const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(messageHistory) }] }],
      });
      response = result.response.text();
    } else if (channelConfig.model === 'deepseek') {
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
    }
  } catch (error) {
    console.error('Error generating response:', error);
    message.channel.send('Sorry, I encountered an error while processing your request.');
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);