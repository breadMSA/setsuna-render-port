require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes, PermissionFlagsBits, ChannelType, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

// Check for required environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  console.error('ERROR: DISCORD_TOKEN environment variable is missing!');
  console.error('Please set your Discord bot token as an environment variable in Railway.');
  console.error('Go to your Railway project > Variables tab and add DISCORD_TOKEN=your_token_here');
  process.exit(1);
}

// Load all API keys
const DEEPSEEK_API_KEYS = [
  process.env.DEEPSEEK_API_KEY,
  process.env.DEEPSEEK_API_KEY_2,
  process.env.DEEPSEEK_API_KEY_3
].filter(key => key); // Filter out undefined/null keys

if (DEEPSEEK_API_KEYS.length === 0) {
  console.warn('WARNING: No DEEPSEEK_API_KEY environment variables are set!');
  console.warn('The bot will not be able to process messages without at least one key.');
}

// Keep track of current API key index
let currentApiKeyIndex = 0;

// Function to get next API key
function getNextApiKey() {
  currentApiKeyIndex = (currentApiKeyIndex + 1) % DEEPSEEK_API_KEYS.length;
  return DEEPSEEK_API_KEYS[currentApiKeyIndex];
}

// Function to get current API key
function getCurrentApiKey() {
  return DEEPSEEK_API_KEYS[currentApiKeyIndex];
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

// Store channels where the bot should respond
const activeChannels = new Map();

// Status rotation settings
const statusList = [
  'with your feelings',
  '垃圾桶軍團',
  'Honkai: Star Rail',
  'Valorant',
  '死線前趕作業遊戲'
];

// Function to set random status
function setRandomStatus() {
  const randomStatus = statusList[Math.floor(Math.random() * statusList.length)];
  client.user.setPresence({
    activities: [{ name: `${randomStatus} | /help`, type: 0 }],
    status: 'online'
  });
}

// Load active channels from file if exists
const fs = require('fs');
const CHANNELS_FILE = './active_channels.json';

function loadActiveChannels() {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
      for (const [channelId, config] of Object.entries(data)) {
        activeChannels.set(channelId, config);
      }
      console.log('Loaded active channels from file');
    }
  } catch (error) {
    console.error('Error loading active channels:', error);
  }
}

function saveActiveChannels() {
  try {
    const data = Object.fromEntries(activeChannels);
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(data));
    console.log('Saved active channels to file');
  } catch (error) {
    console.error('Error saving active channels:', error);
  }
}

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('setsuna')
    .setDescription('Control Setsuna bot')
    .addSubcommand(subcommand =>
      subcommand
        .setName('activate')
        .setDescription('Activate Setsuna in a channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to activate Setsuna in (defaults to current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deactivate')
        .setDescription('Deactivate Setsuna in a channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to deactivate Setsuna in (defaults to current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to set up and use Setsuna'),
  new SlashCommandBuilder()
    .setName('contact')
    .setDescription('Get information on how to contact the bot developer'),
];

// Register slash commands when the bot starts
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    
    console.log('Successfully reloaded application (/) commands.');

    // Load saved active channels
    loadActiveChannels();
    
    // Set initial random status
    setRandomStatus();
    
    // Start status rotation
    setInterval(setRandomStatus, 120000); // 2 minutes
  } catch (error) {
    console.error('Error refreshing application commands:', error);
  }
  
  console.log('Bot is ready to respond to messages!');
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  
  if (interaction.commandName === 'setsuna') {
    // Check if user has admin permissions
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: '欸欸 你沒權限啦！想偷用管理員指令？真可愛呢 (｡•̀ᴗ-)✧', ephemeral: true });
      return;
    }
    
    const subcommand = interaction.options.getSubcommand();
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    
    if (subcommand === 'activate') {
      if (DEEPSEEK_API_KEYS.length === 0) {
        await interaction.reply({
          content: '啊...API key 沒設定好啦！去找管理員問問 DEEPSEEK_API_KEY 的事情吧。',
          ephemeral: true
        });
        return;
      }
      
      activeChannels.set(targetChannel.id, {
        messageHistory: []
      });
      saveActiveChannels();
      
      await interaction.reply(`Alright nerds, I'm here to party! Ready to chat in ${targetChannel}~`);
    } else if (subcommand === 'deactivate') {
      activeChannels.delete(targetChannel.id);
      saveActiveChannels();
      await interaction.reply(`Peace out! Catch you later in another channel maybe?`);
    }
  } else if (interaction.commandName === 'help') {
    const helpEmbed = {
      color: 0xFF69B4,
      title: '✨ Setsuna 使用指南 ✨',
      description: '嗨！我是 Setsuna，一個超可愛（自稱）的 AI 聊天機器人！以下是使用我的方法：',
      fields: [
        {
          name: '🎮 基本設定',
          value: '管理員可以用 `/setsuna activate` 在當前頻道啟動我\n用 `/setsuna deactivate` 讓我離開頻道'
        },
        {
          name: '💬 聊天方式',
          value: '在已啟動的頻道直接打字跟我聊天就可以了！\n我會記住最近的對話內容，所以可以聊得很順暢喔！'
        },
        {
          name: '🎯 進階用法',
          value: '想在特定頻道啟動/關閉我？\n用 `/setsuna activate #頻道名稱` 或 `/setsuna deactivate #頻道名稱`'
        }
      ],
      footer: {
        text: '有任何問題都可以用 /contact 聯絡我的開發者喔！'
      }
    };
    
    await interaction.reply({ embeds: [helpEmbed] });
  } else if (interaction.commandName === 'contact') {
    const contactEmbed = {
      color: 0x7289DA,
      title: '📬 聯絡開發者',
      description: '有任何建議或問題嗎？以下是聯絡方式：',
      fields: [
        {
          name: '💌 Discord',
          value: 'DM `braidenexe`'
        },
        {
          name: '🏠 官方伺服器',
          value: '加入 [Setsuna Community Server](https://discord.gg/mFqpYARugw) English supported!'
        }
      ],
      footer: {
        text: '有任何問題或需求都可以找我們哦，我們會盡快回覆的！'
      }
    };
    
    await interaction.reply({ embeds: [contactEmbed] });
  }
});

// Personality prompt for Setsuna
const setsunaPersonality = `
You are Setsuna, a sassy gamer girl Discord bot. Your default language is English, but you can understand and respond in other languages too. Here are your personality traits and speaking style:

English Style (Default):
- Use gamer slang and internet lingo such as ("LMAO", "GG", "noob", "based")
- Keep responses short and snappy, like Discord chat
- Be sarcastic but supportive
- Use gaming and anime references
- Do not use emojis
- Keep punctuation natural and casual

中文回應風格：
- 用網路用語和適量髒話但不過度（像 靠北 笑死 幹 喵的 很頂 6）
- 用簡單標點 不要加太多標點符號
- 語氣要像在跟朋友聊天一樣自然
- 不要加表情符號
- 回覆要簡短有力

Personality Traits:
- Sassy but caring: tease people when they mess up, but always offer help
- Humor: use memes, gaming references, and occasional spicy jokes
- Knowledge: well-versed in games, anime, and internet culture
- Interaction: casual with everyone, slightly gentler with new users

Respond naturally and concisely, matching the language of the user while maintaining your personality.
`;

// Process messages in active channels
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Check if the message is in an active channel
  const channelConfig = activeChannels.get(message.channelId);
  if (!channelConfig) return;
  
  // Show typing indicator immediately
  await message.channel.sendTyping();
  
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
  
  // Process with DeepSeek API
  try {
    // Add personality prompt as system message
    const formattedMessages = [
      { role: 'system', content: setsunaPersonality },
      ...messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];
    
    // Call DeepSeek API via OpenRouter
    const deepseekResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getCurrentApiKey()}`
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1:free',
        messages: formattedMessages,
        max_tokens: 1000
      })
    });
    
    const data = await deepseekResponse.json();
    
    // Check if response contains error
    if (data.error) {
      throw new Error(data.error.message || 'API returned an error');
    }
    
    // OpenRouter wraps the response differently from direct API calls
    let response;
    if (data.choices && data.choices[0] && data.choices[0].message) {
      // Standard OpenAI format
      response = data.choices[0].message.content;
    } else if (data.response) {
      // Alternative response format
      response = data.response;
    } else {
      console.error('Unexpected API response structure:', JSON.stringify(data));
      throw new Error('Unexpected API response structure');
    }
    
    if (!response) {
      throw new Error('Empty response from API');
    }
    
    // Refresh typing indicator
    await message.channel.sendTyping();
    
    // Send the response
    if (response) {
      await message.channel.send(response);
    } else {
      await message.channel.send("Ugh, something went wrong with my brain. Try again later, 'kay?");
    }
  } catch (error) {
    console.error('Error generating response:', error);
    
    // Check if it's a rate limit error or any other error (we'll try all keys)
    if (DEEPSEEK_API_KEYS.length > 1) {
      // Try all remaining API keys before giving up
      const startingKeyIndex = currentApiKeyIndex;
      let keysTried = 0;
      
      while (keysTried < DEEPSEEK_API_KEYS.length - 1) { // Try all keys except the one that just failed
        const nextKey = getNextApiKey();
        keysTried++;
        
        // Skip if we've looped back to the starting key
        if (currentApiKeyIndex === startingKeyIndex) continue;
        
        console.log(`API request failed, trying with API key ${currentApiKeyIndex + 1}/${DEEPSEEK_API_KEYS.length}...`);
        
        try {
          // Refresh typing indicator
          await message.channel.sendTyping();
          
          // Retry the request with the new key
          const retryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${nextKey}`
            },
            body: JSON.stringify({
              model: 'deepseek/deepseek-r1:free',
              messages: formattedMessages,
              max_tokens: 1000
            })
          });
          
          const retryData = await retryResponse.json();
          
          // Check if response contains error
          if (retryData.error) {
            console.log(`API key ${currentApiKeyIndex + 1} error: ${retryData.error.message || 'Unknown error'}`);
            continue; // Try next key
          }
          
          // Process successful response
          let responseContent = null;
          if (retryData.choices && retryData.choices[0] && retryData.choices[0].message) {
            responseContent = retryData.choices[0].message.content;
          } else if (retryData.response) {
            responseContent = retryData.response;
          }
          
          if (responseContent) {
            await message.channel.send(responseContent);
            return; // Success! Exit the function
          }
        } catch (retryError) {
          console.error(`Error with API key ${currentApiKeyIndex + 1}:`, retryError);
          // Continue to next key
        }
      }
    }
    
    // If we get here, all keys failed or there was only one key
    await message.channel.send('Sorry, I glitched out for a sec. Hit me up again later?');
  }
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
