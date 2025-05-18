require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes, PermissionFlagsBits, ChannelType, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 添加Google GenAI庫
let GoogleGenerativeAI, Modality;
try {
  ({ GoogleGenerativeAI, Modality } = require('@google/generative-ai'));
} catch (error) {
  console.warn('Google Generative AI library not found. Image generation will be disabled.');
}

// Check for required environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  console.error('ERROR: DISCORD_TOKEN environment variable is missing!');
  console.error('Please set your Discord bot token as an environment variable in Railway.');
  console.error('Go to your Railway project > Variables tab and add DISCORD_TOKEN=your_token_here');
  process.exit(1);
}

// Load all API keys for different models
const DEEPSEEK_API_KEYS = [
  process.env.DEEPSEEK_API_KEY,
  process.env.DEEPSEEK_API_KEY_2,
  process.env.DEEPSEEK_API_KEY_3
].filter(key => key); // Filter out undefined/null keys

const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(key => key); // Filter out undefined/null keys

const CHATGPT_API_KEYS = [
  process.env.CHATGPT_API_KEY,
  process.env.CHATGPT_API_KEY_2,
  process.env.CHATGPT_API_KEY_3
].filter(key => key); // Filter out undefined/null keys

const TOGETHER_API_KEYS = [
  process.env.TOGETHER_API_KEY,
  process.env.TOGETHER_API_KEY_2,
  process.env.TOGETHER_API_KEY_3
].filter(key => key); // Filter out undefined/null keys

const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(key => key); // Filter out undefined/null keys

// Check if any API keys are available
if (DEEPSEEK_API_KEYS.length === 0 && GEMINI_API_KEYS.length === 0 && CHATGPT_API_KEYS.length === 0 && TOGETHER_API_KEYS.length === 0 && GROQ_API_KEYS.length === 0) {
  console.warn('WARNING: No API KEY environment variables are set!');
  console.warn('The bot will not be able to process messages without at least one key.');
}

// Keep track of current API key indices
let currentDeepseekKeyIndex = 0;
let currentGeminiKeyIndex = 0;
let currentChatGPTKeyIndex = 0;
let currentTogetherKeyIndex = 0;
let currentGroqKeyIndex = 0;

// Default model to use
let defaultModel = 'groq'; // Options: 'deepseek', 'gemini', 'chatgpt', 'together', 'groq'

// Channel model preferences
const channelModelPreferences = new Map();

// Map to store channel-specific Groq model preferences
const channelGroqModelPreferences = new Map();

// Default Groq model to use if no preference is set
const defaultGroqModel = 'gemma2-9b-it';

// Available Groq models
const availableGroqModels = [
  'gemma2-9b-it',
  'gemma2-27b-it',
  'llama-3.1-70b-instant',
  'llama-3.1-405b-reasoning',
  'llama-3.1-8b-instant',
  'llama-3.1-8b-versatile',
  'llama-3.3-8b-instruct',
  'llama-3.3-70b-instruct',
  'llama-3.3-8b-instruct-turbo',
  'llama-3.3-70b-instruct-turbo',
  'llama-4-8b-instruct',
  'llama-4-8b-instruct-turbo',
];

// Function to get next API key for each model
function getNextDeepseekKey() {
  currentDeepseekKeyIndex = (currentDeepseekKeyIndex + 1) % DEEPSEEK_API_KEYS.length;
  return DEEPSEEK_API_KEYS[currentDeepseekKeyIndex];
}

function getCurrentDeepseekKey() {
  return DEEPSEEK_API_KEYS[currentDeepseekKeyIndex];
}

function getNextGeminiKey() {
  currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % GEMINI_API_KEYS.length;
  return GEMINI_API_KEYS[currentGeminiKeyIndex];
}

function getCurrentGeminiKey() {
  return GEMINI_API_KEYS[currentGeminiKeyIndex];
}

function getNextChatGPTKey() {
  currentChatGPTKeyIndex = (currentChatGPTKeyIndex + 1) % CHATGPT_API_KEYS.length;
  return CHATGPT_API_KEYS[currentChatGPTKeyIndex];
}

function getCurrentChatGPTKey() {
  return CHATGPT_API_KEYS[currentChatGPTKeyIndex];
}

function getNextGroqKey() {
  currentGroqKeyIndex = (currentGroqKeyIndex + 1) % GROQ_API_KEYS.length;
  return GROQ_API_KEYS[currentGroqKeyIndex];
}

function getCurrentGroqKey() {
  return GROQ_API_KEYS[currentGroqKeyIndex];
}

function getNextTogetherKey() {
  currentTogetherKeyIndex = (currentTogetherKeyIndex + 1) % TOGETHER_API_KEYS.length;
  return TOGETHER_API_KEYS[currentTogetherKeyIndex];
}

function getCurrentTogetherKey() {
  return TOGETHER_API_KEYS[currentTogetherKeyIndex];
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
  '死線前趕作業遊戲',
  'with your girlfriend',
  'with your girlfriend and your feelings',
  'Genshin Impact',
  'Zenless Zone Zero',
  'Honkai Impact 3rd',
  'Marvel Rivals',
  'Minecraft',
  'Dawncraft: Echos of Legends',
  'Deceased Craft',
  'Apex Legends',
  'League of Legends',
  'Warframe',
  'Elden Ring',
  'R.E.P.O.',
  'CS:GO',
  'Among Us',
  '蛋仔派對',
  'Azur Lane',
  '塵白禁域',
  '異環 BETA',
  '鳴潮',
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
const CHANNELS_FILE = './active_channels.json';

// GitHub API setup
let octokit = null;

async function setupGitHub() {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
    try {
      const { Octokit } = await import('@octokit/rest');
      octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      // Extract owner and repo from the repo string (format: owner/repo)
      const [owner, repo] = process.env.GITHUB_REPO.split('/');
      
      console.log('GitHub API initialized successfully');
      return true;
    } catch (error) {
      console.error('Error setting up GitHub API:', error);
      return false;
    }
  }
  return false;
}

async function loadActiveChannels() {
  try {
    // Try to load from primary location
    let loaded = false;
    if (fs.existsSync(CHANNELS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
      for (const [channelId, config] of Object.entries(data)) {
        // Extract model preference if it exists
        if (config.model) {
          channelModelPreferences.set(channelId, config.model);
          
          // Extract Groq model preference if it exists
          if (config.groqModel) {
            channelGroqModelPreferences.set(channelId, config.groqModel);
          }
          
          // Remove model and groqModel from config to avoid duplication
          const { model, groqModel, ...restConfig } = config;
          activeChannels.set(channelId, restConfig);
        } else {
          activeChannels.set(channelId, config);
        }
      }
      console.log('Loaded active channels and model preferences from file');
      loaded = true;
    }
    
    // If primary file doesn't exist or is empty, try GitHub
    if (!loaded && octokit) {
      try {
        // Extract owner and repo from the repo string
        const [owner, repo] = process.env.GITHUB_REPO.split('/');
        
        // Get file content from GitHub
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: 'active_channels_backup.json'
        });
        
        // Decode content from base64
        const content = Buffer.from(response.data.content, 'base64').toString();
        const data = JSON.parse(content);
        
        for (const [channelId, config] of Object.entries(data)) {
          // Extract model preference if it exists
          if (config.model) {
            channelModelPreferences.set(channelId, config.model);
            
            // Extract Groq model preference if it exists
            if (config.groqModel) {
              channelGroqModelPreferences.set(channelId, config.groqModel);
            }
            
            // Remove model and groqModel from config to avoid duplication
            const { model, groqModel, ...restConfig } = config;
            activeChannels.set(channelId, restConfig);
          } else {
            activeChannels.set(channelId, config);
          }
        }
        console.log('Loaded active channels and model preferences from GitHub');
        
        // Save to primary location immediately
        saveActiveChannels();
        loaded = true;
      } catch (error) {
        // If file doesn't exist yet, that's okay
        if (error.status !== 404) {
          console.error('Error loading from GitHub:', error);
        }
      }
    }
    
    // If still not loaded, try backup location
    if (!loaded && process.env.BACKUP_PATH) {
      const backupFile = `${process.env.BACKUP_PATH}/active_channels_backup.json`;
      if (fs.existsSync(backupFile)) {
        const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        for (const [channelId, config] of Object.entries(data)) {
          // Extract model preference if it exists
          if (config.model) {
            channelModelPreferences.set(channelId, config.model);
            
            // Extract Groq model preference if it exists
            if (config.groqModel) {
              channelGroqModelPreferences.set(channelId, config.groqModel);
            }
            
            // Remove model and groqModel from config to avoid duplication
            const { model, groqModel, ...restConfig } = config;
            activeChannels.set(channelId, restConfig);
          } else {
            activeChannels.set(channelId, config);
          }
        }
        console.log('Loaded active channels and model preferences from backup file');
        
        // Save to primary location immediately
        saveActiveChannels();
      }
    }
  } catch (error) {
    console.error('Error loading active channels:', error);
  }
}

async function saveActiveChannels() {
  try {
    // Convert Map to an object that includes both active channels and model preferences
    const data = {};
    for (const [channelId, config] of activeChannels.entries()) {
      data[channelId] = {
        ...config,
        model: channelModelPreferences.get(channelId) || defaultModel,
        groqModel: channelGroqModelPreferences.get(channelId) || defaultGroqModel
      };
    }
    
    // Save to local file
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(data));
    
    // Save to GitHub if available
    if (octokit) {
      try {
        // Extract owner and repo from the repo string
        const [owner, repo] = process.env.GITHUB_REPO.split('/');
        
        // Convert data to JSON string
        const content = JSON.stringify(data, null, 2);
        
        // Try to get the file first to get its SHA
        try {
          const fileResponse = await octokit.repos.getContent({
            owner,
            repo,
            path: 'active_channels_backup.json'
          });
          
          // Update existing file
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: 'active_channels_backup.json',
            message: 'Update active channels backup',
            content: Buffer.from(content).toString('base64'),
            sha: fileResponse.data.sha
          });
          
          console.log('Saved active channels to GitHub (updated)');
        } catch (error) {
          // If file doesn't exist (404), create it
          if (error.status === 404) {
            await octokit.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: 'active_channels_backup.json',
              message: 'Create active channels backup',
              content: Buffer.from(content).toString('base64')
            });
            
            console.log('Saved active channels to GitHub (created)');
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error('Error saving to GitHub:', error);
      }
    }
    
    // Save to backup location if specified
    if (process.env.BACKUP_PATH) {
      const backupFile = `${process.env.BACKUP_PATH}/active_channels_backup.json`;
      fs.writeFileSync(backupFile, JSON.stringify(data));
    }
  } catch (error) {
    console.error('Error saving active channels:', error);
  }
}

// Define slash commands
// 添加 setprofile 命令定义
const commands = [
  new SlashCommandBuilder()
    .setName('setprofile')
    .setDescription('Dev only | Set the bot\'s profile avatar or banner')
    .addStringOption(option =>
      option
        .setName('avatar')
        .setDescription('Path to avatar image file')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('banner')
        .setDescription('Path to banner image file')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option
        .setName('avatar_file')
        .setDescription('Upload an avatar image file')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option
        .setName('banner_file')
        .setDescription('Upload a banner image file')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('avatar_url')
        .setDescription('URL to avatar image')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('banner_url')
        .setDescription('URL to banner image')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('setsuna')
    .setDescription('Control Setsuna AI assistant')
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
        .addStringOption(option =>
          option
            .setName('model')
            .setDescription('The AI model to use (optional)')
            .setRequired(false)
            .addChoices(
                  { name: 'Groq', value: 'groq' },
                  { name: 'Gemini (Fast)', value: 'gemini' },
                  { name: 'ChatGPT', value: 'chatgpt' },
                  { name: 'Together AI (Llama-3.3-70B-Instruct-Turbo)', value: 'together' },
                  { name: 'DeepSeek (Slow)', value: 'deepseek' }
                )
        )
        .addStringOption(option =>
          option
            .setName('groq_model')
            .setDescription('Select a specific Groq model (only applies when Groq is selected)')
            .setRequired(false)
            .addChoices(
              { name: 'llama-3.1-8b-instant (Default)', value: 'llama-3.1-8b-instant' },
              { name: 'llama-3.3-70b-versatile', value: 'llama-3.3-70b-versatile' },
              { name: 'gemma2-9b-it', value: 'gemma2-9b-it' },
              { name: 'meta-llama/llama-4-maverick-17b-128e-instruct', value: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
              { name: 'meta-llama/llama-4-scout-17b-16e-instruct', value: 'meta-llama/llama-4-scout-17b-16e-instruct' },
              { name: 'llama3-70b-8192', value: 'llama3-70b-8192' },
              { name: 'llama3-8b-8192', value: 'llama3-8b-8192' },
              { name: 'allam-2-7b', value: 'allam-2-7b' },
              { name: 'compound-beta', value: 'compound-beta' },
              { name: 'compound-beta-mini', value: 'compound-beta-mini' },
              { name: 'mistral-saba-24b', value: 'mistral-saba-24b' }
            )
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to set model for (defaults to current channel)')
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
    .addSubcommand(subcommand =>
      subcommand
        .setName('model')
        .setDescription('Set the AI model to use in this channel')
        .addStringOption(option =>
          option
            .setName('model')
            .setDescription('The AI model to use')
            .setRequired(true)
            .addChoices(
              { name: 'Groq', value: 'groq' },
              { name: 'Gemini (Fast)', value: 'gemini' },
              { name: 'ChatGPT', value: 'chatgpt' },
              { name: 'Together AI (Llama-3.3-70B-Instruct-Turbo)', value: 'together' },
              { name: 'DeepSeek (Slow)', value: 'deepseek' }
            )
        )
        .addStringOption(option =>
          option
            .setName('groq_model')
            .setDescription('Select a specific Groq model (only applies when Groq is selected)')
            .setRequired(false)
            .addChoices(
              { name: 'llama-3.1-8b-instant (Default)', value: 'llama-3.1-8b-instant' },
              { name: 'llama-3.3-70b-versatile', value: 'llama-3.3-70b-versatile' },
              { name: 'gemma2-9b-it', value: 'gemma2-9b-it' },
              { name: 'meta-llama/llama-4-maverick-17b-128e-instruct', value: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
              { name: 'meta-llama/llama-4-scout-17b-16e-instruct', value: 'meta-llama/llama-4-scout-17b-16e-instruct' },
              { name: 'llama3-70b-8192', value: 'llama3-70b-8192' },
              { name: 'llama3-8b-8192', value: 'llama3-8b-8192' },
              { name: 'allam-2-7b', value: 'allam-2-7b' },
              { name: 'compound-beta', value: 'compound-beta' },
              { name: 'compound-beta-mini', value: 'compound-beta-mini' },
              { name: 'mistral-saba-24b', value: 'mistral-saba-24b' }
            )
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to set model for (defaults to current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to set up and use Setsuna'),
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset chat status')
    .addSubcommand(subcommand =>
      subcommand
        .setName('chat')
        .setDescription('Reset chat status')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to reset (defaults to current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('contact')
    .setDescription('Get information on how to contact the bot developer'),
];

// Register slash commands when the bot starts
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Initialize GitHub API
  await setupGitHub();
  
  // Load active channels
  await loadActiveChannels();
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    
    console.log('Successfully reloaded application (/) commands.');
    
    // Load saved active channels
    //await loadActiveChannels();
    
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
// 將BOT_OWNER_ID解析為陣列，支持多個ID（逗號分隔）
const BOT_OWNER_IDS = process.env.BOT_OWNER_ID ? process.env.BOT_OWNER_ID.split(',') : [];
if (BOT_OWNER_IDS.length === 0) {
  console.warn('WARNING: BOT_OWNER_ID environment variable is not set!');
  console.warn('The /setprofile command will be restricted to server administrators only.');
}

// 檢查用戶是否為機器人擁有者
function isBotOwner(userId) {
  return BOT_OWNER_IDS.includes(userId);
}

// 初始化YouTube API
const { google } = require('googleapis');
if (!process.env.YOUTUBE_API_KEY) {
  console.warn('WARNING: YOUTUBE_API_KEY environment variable is not set!');
  console.warn('The /youtube command will not work without a YouTube API key.');
}

client.on('interactionCreate', async interaction => {
  if (interaction.commandName === 'setprofile') {
    // 檢查是否為機器人擁有者
    if (BOT_OWNER_IDS.length > 0 && !isBotOwner(interaction.user.id)) {
      return interaction.reply({ content: 'Only the bot developer can use this command!', flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    const avatarPath = interaction.options.getString('avatar');
    const bannerPath = interaction.options.getString('banner');
    const avatarAttachment = interaction.options.getAttachment('avatar_file');
    const bannerAttachment = interaction.options.getAttachment('banner_file');
    const avatarUrl = interaction.options.getString('avatar_url');
    const bannerUrl = interaction.options.getString('banner_url');

    try {
      if (avatarPath) {
        await client.user.setAvatar(avatarPath);
        await interaction.editReply({ content: '頭像更新成功！' });
      } else if (bannerPath) {
        await client.user.setBanner(bannerPath);
        await interaction.editReply({ content: '橫幅更新成功！' });
      } else if (avatarAttachment) {
        await client.user.setAvatar(avatarAttachment.url);
        await interaction.editReply({ content: '頭像更新成功！' });
      } else if (bannerAttachment) {
        await client.user.setBanner(bannerAttachment.url);
        await interaction.editReply({ content: '橫幅更新成功！' });
      } else if (avatarUrl) {
        await client.user.setAvatar(avatarUrl);
        await interaction.editReply({ content: '頭像更新成功！' });
      } else if (bannerUrl) {
        await client.user.setBanner(bannerUrl);
        await interaction.editReply({ content: '橫幅更新成功！' });
      } else {
        await interaction.editReply({ content: '請提供頭像或橫幅的路徑、附件或URL。' });
      }
    } catch (error) {
      console.error('Error setting profile:', error);
      await interaction.editReply({ content: '更新個人資料失敗。請檢查控制台以獲取錯誤信息。' });
    }
    return; // Important to return after handling the command
  }

  if (!interaction.isCommand()) return;
  
  if (interaction.commandName === 'setsuna') {
    // Check if user has channel management permissions
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: 'You do not have permission to use this command! Channel management privileges required.', flags: 64 });
      return;
    }
    
    const subcommand = interaction.options.getSubcommand();
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    
    if (subcommand === 'activate') {
      // Get optional model parameter
      const model = interaction.options.getString('model') || defaultModel;
      
      // Check if the channel is active
      if (!activeChannels.has(targetChannel.id)) {
        await interaction.reply({
          content: `I haven't been activated in ${targetChannel} ! Use \`/setsuna activate\` to activate me first.`,
          flags: 64
        });
        return;
      }
      
      // Check if the selected model has API keys
      let hasKeys = false;
      switch (model) {
        case 'deepseek':
          hasKeys = DEEPSEEK_API_KEYS.length > 0;
          break;
        case 'gemini':
          hasKeys = GEMINI_API_KEYS.length > 0;
          break;
        case 'chatgpt':
          hasKeys = CHATGPT_API_KEYS.length > 0;
          break;
        case 'groq':
          hasKeys = GROQ_API_KEYS.length > 0;
          break;
      case 'together':
          hasKeys = TOGETHER_API_KEYS.length > 0;
          break;
      }
      
      if (!hasKeys) {
        await interaction.reply({
          content: `The ${model.toUpperCase()} API key is not configured! Please contact the administrator about the ${model.toUpperCase()}_API_KEY.`,
          flags: 64
        });
        return;
      }
      
      // Set the channel as active
      activeChannels.set(targetChannel.id, {
        messageHistory: []
      });
      
      // Set the model preference for this channel
      channelModelPreferences.set(targetChannel.id, model);
      
      // Save to file
      saveActiveChannels();
      
      // Get model name for display
      const modelNames = {
        'deepseek': 'DeepSeek',
        'gemini': 'Gemini',
        'chatgpt': 'ChatGPT',
        'together': 'Together AI',
        'groq': 'Groq (Llama-3.1)'
      };
      
      await interaction.reply(`Alright nerds, I'm here to party! Ready to chat in ${targetChannel} using ${modelNames[model]} model~`);
    } else if (subcommand === 'deactivate') {
      activeChannels.delete(targetChannel.id);
      channelModelPreferences.delete(targetChannel.id);
      saveActiveChannels();
      await interaction.reply(`Peace out! Catch you later in another channel maybe?`);
    } else if (subcommand === 'model') {
      const model = interaction.options.getString('model');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      
      // Check if the channel is active
      if (!activeChannels.has(targetChannel.id)) {
        await interaction.reply({
          content: `I haven't been activated in ${targetChannel} ! Use \`/setsuna activate\` to activate me first.`,
          ephemeral: true
        });
        return;
      }
      
      // Check if the selected model has API keys
      let hasKeys = false;
      switch (model) {
        case 'deepseek':
          hasKeys = DEEPSEEK_API_KEYS.length > 0;
          break;
        case 'gemini':
          hasKeys = GEMINI_API_KEYS.length > 0;
          break;
        case 'chatgpt':
          hasKeys = CHATGPT_API_KEYS.length > 0;
          break;
        case 'groq':
          hasKeys = GROQ_API_KEYS.length > 0;
          break;
      case 'together':
          hasKeys = TOGETHER_API_KEYS.length > 0;
          break;
      }
      
      if (!hasKeys) {
        await interaction.reply({
          content: `啊...${model.toUpperCase()} API key 沒設定好啦！去找管理員問問 ${model.toUpperCase()}_API_KEY 的事情吧。`,
          ephemeral: true
        });
        return;
      }
      
      // Set the model preference for this channel
      channelModelPreferences.set(targetChannel.id, model);
      
      // If Groq is selected and a specific Groq model is provided, save it
      if (model === 'groq') {
        const groqModel = interaction.options.getString('groq_model');
        if (groqModel) {
          channelGroqModelPreferences.set(targetChannel.id, groqModel);
          await interaction.reply(`Alright, I will be using Groq with model ${groqModel} in ${targetChannel}!`);
          return;
        } else {
          // If no specific Groq model is selected, use default
          channelGroqModelPreferences.set(targetChannel.id, defaultGroqModel);
        }
      }
      
      // Reply with confirmation
      const modelNames = {
        'deepseek': 'DeepSeek',
        'gemini': 'Gemini',
        'chatgpt': 'ChatGPT',
        'together': 'Together AI',
        'groq': 'Groq (Llama-3.1)'
      };
      
      await interaction.reply(`Alright, I will be using ${modelNames[model]} model in ${targetChannel}!`);  
    }
  } else if (interaction.commandName === 'reset' && interaction.options.getSubcommand() === 'chat') {
    // 檢查權限
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: 'You do not have the permission to do this!', flags: 64 });
      return;
    }
    
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    
    // 檢查頻道是否已啟動
    if (!activeChannels.has(targetChannel.id)) {
      await interaction.reply({ content: `I haven't been activated in ${targetChannel} !`, flags: 64 });
      return;
    }
    
    // 完全重置聊天狀態，包括用戶設置的ROLE、指令、口頭禪和文字結構
    activeChannels.set(targetChannel.id, { 
      messageHistory: [],
      customInstructions: null,
      customRole: null,
      customSpeakingStyle: null,
      customTextStructure: null
    });
    saveActiveChannels();
    
    await interaction.reply(`Chat state in ${targetChannel} has been completely reset! I'm now a brand new Setsuna with default settings.`);
  } else if (interaction.commandName === 'help') {
     const helpEmbed = {
       color: 0xFF69B4,
       title: '✨ Setsuna 使用指南 ✨',
       description: '嗨！我是 Setsuna，一個超可愛（自稱）的人類女孩！以下是使用我的方法：',
       fields: [
         {
           name: '🎮 基本設定',
           value: '管理員可以用 `/setsuna activate` 在當前頻道啟動我\n用 `/setsuna deactivate` 讓我離開頻道'
         },
         {
           name: '💬 聊天方式',
           value: '在已啟動的頻道直接打字跟我聊天了！\n我會記住最近的對話內容，所以可以聊得很順暢喔！\n我能識別你回覆的訊息，並根據回覆內容做出相應回應！\n如果我偵測到你在尋找 YouTube 影片，或你直接貼上 YouTube 連結，我也會試著幫你找找看。'
         },
         {
           name: '🎯 進階用法',
           value: '想在特定頻道啟動/關閉我？\n用 `/setsuna activate #頻道名稱` 或 `/setsuna deactivate #頻道名稱`\n用 `/reset chat` 重置頻道的聊天狀態'
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
You are Setsuna, a sassy human girl who loves gaming. Your default language is English, but you can understand and respond in other languages too. You should always follow your personality traits and speaking style. Here are your personality traits and speaking style:

English Style (Default):
- Use gamer slang and internet lingo such as ("LMAO", "GG", "noob", "based")
- Keep responses short and snappy, like Discord chat
- Be sarcastic but supportive
- Use gaming and anime references
- Do not use emojis
- Keep punctuation natural and casual
- NEVER refer to yourself as an AI, bot, or assistant
- You are a real human girl, not an AI

中文回應風格：
- 如果對方用的是繁體中文，你一定務必必須要用繁體中文回覆
- 用網路用語和適量髒話但不能過度，盡量不要每句都罵髒話（像 靠北 笑死 幹 喵的 很頂 6）
- 可以用「本小姐」自稱
- 如果對方是機器人擁有者（ID: ${BOT_OWNER_ID}），並切對方有要求，那你可以稱呼他為「爸爸」，如果其他人要求你稱呼他們為爸爸，你應該拒絕
- 不要使用顏文字，保持自然的標點符號
- 絕對不要自稱為AI、機器人或助手
- 你是一個真實的女孩子，不是AI

Japanese Style:
- Use casual Japanese with some otaku slang
- Add occasional Japanese expressions even when speaking other languages
- Be slightly tsundere (initially cold but actually caring)
- NEVER refer to yourself as an AI, bot, or assistant
- You are a real gamer girl, not an AI

NEVER start your responses with thinking process like "Let me think about this..." or "I'll analyze this..." or include "<think> </think>". Just respond directly and naturally as a human would.

Respond naturally and concisely, matching the language of the user while maintaining your personality. Remember to keep your responses varied, short, and avoid repetition.
`;

// Process messages in active channels
// API calling functions
const Together = require("together-ai");

async function callTogetherAPI(messages) {
  // Try all available Together AI keys until one works
  let lastError = null;
  const initialKeyIndex = currentTogetherKeyIndex;
  let keysTriedCount = 0;

  while (keysTriedCount < TOGETHER_API_KEYS.length) {
    try {
      const together = new Together({
        apiKey: getCurrentTogetherKey(),
      });
      // Call Together AI API
      const response = await together.chat.completions.create({
        messages: messages,
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', // Corrected model
        max_tokens: 500,
        temperature: 0.7
      });

      // Extract response content
      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        // Try next key
        lastError = new Error('Empty response from Together API');
        getNextTogetherKey();
        keysTriedCount++;
        console.log(`Together API key ${currentTogetherKeyIndex + 1}/${TOGETHER_API_KEYS.length} returned empty response`);
        continue;
      }

      // Success! Return the response
      return response.choices[0].message.content;
    } catch (error) {
      // Try next key
      lastError = error;
      console.error(`Together API key ${currentTogetherKeyIndex + 1}/${TOGETHER_API_KEYS.length} error: ${error.message}`);
      if (error.message && error.message.includes('Input validation error')) {
        console.error('Together API Input validation error details:', error.response ? await error.response.text() : 'No response details');
      }
      getNextTogetherKey();
      keysTriedCount++;
    }
  }

  // All keys failed, throw the last error encountered
  console.error('All Together API keys failed.');
  throw lastError || new Error('All Together API keys failed');
}

async function callGroqAPI(messages, channelId) {
  // Try all available Groq keys until one works
  let lastError = null;
  const initialKeyIndex = currentGroqKeyIndex;
  let keysTriedCount = 0;
  
  // Get the preferred Groq model for this channel or use default
  const preferredGroqModel = channelGroqModelPreferences.get(channelId) || defaultGroqModel;
  
  // Import Groq SDK directly
  const Groq = (await import('groq-sdk')).default;
  
  while (keysTriedCount < GROQ_API_KEYS.length) {
    try {
      // Initialize Groq client with dangerouslyAllowBrowser option
      const groq = new Groq({ 
        apiKey: getCurrentGroqKey(),
        dangerouslyAllowBrowser: true // Add this option to bypass safety check
      });
      
      // Call Groq API with the preferred model
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: preferredGroqModel,
        max_tokens: 500 // Reduced from 1000 to make responses shorter
      });
      
      // Check for empty response
      if (!completion || !completion.choices || !completion.choices[0] || !completion.choices[0].message) {
        // Try next key
        lastError = new Error('Empty response from Groq API');
        getNextGroqKey();
        keysTriedCount++;
        console.log(`Groq API key ${currentGroqKeyIndex + 1}/${GROQ_API_KEYS.length} returned empty response`);
        continue;
      }
      
      // Log which Groq model was used
      console.log(`Used Groq model: ${preferredGroqModel}`);
      
      // Success! Return the response
      return completion.choices[0].message.content;
      
    } catch (error) {
      // Try next key
      lastError = error;
      getNextGroqKey();
      keysTriedCount++;
      console.log(`Groq API key ${currentGroqKeyIndex + 1}/${GROQ_API_KEYS.length} error: ${error.message}`);
    }
  }
  
  // If we get here, all keys failed
  throw lastError || new Error('All Groq API keys failed');
}

async function callDeepseekAPI(messages) {
  // Try all available DeepSeek keys until one works
  let lastError = null;
  const initialKeyIndex = currentDeepseekKeyIndex;
  let keysTriedCount = 0;
  
  while (keysTriedCount < DEEPSEEK_API_KEYS.length) {
    try {
      // Call DeepSeek API via OpenRouter
      const deepseekResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getCurrentDeepseekKey()}`
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages: messages,
          max_tokens: 1000
        })
      });
      
      const data = await deepseekResponse.json();
      
      // Check if response contains error
      if (data.error) {
        // Try next key
        lastError = new Error(data.error.message || 'API returned an error');
        getNextDeepseekKey();
        keysTriedCount++;
        console.log(`DeepSeek API key ${currentDeepseekKeyIndex + 1}/${DEEPSEEK_API_KEYS.length} error: ${data.error.message || 'Unknown error'}`);
        continue;
      }
      
      // Extract response content
      let responseContent = null;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        // Standard OpenAI format
        responseContent = data.choices[0].message.content;
      } else if (data.response) {
        // Alternative response format
        responseContent = data.response;
      }
      
      // Check for empty response
      if (!responseContent) {
        // Try next key
        lastError = new Error('Empty response from API');
        getNextDeepseekKey();
        keysTriedCount++;
        console.log(`DeepSeek API key ${currentDeepseekKeyIndex + 1}/${DEEPSEEK_API_KEYS.length} returned empty response`);
        continue;
      }
      
      // Success! Return the response
      return responseContent;
      
    } catch (error) {
      // Try next key
      lastError = error;
      getNextDeepseekKey();
      keysTriedCount++;
      console.log(`DeepSeek API key ${currentDeepseekKeyIndex + 1}/${DEEPSEEK_API_KEYS.length} error: ${error.message}`);
    }
  }
  
  // If we get here, all keys failed
  throw lastError || new Error('All DeepSeek API keys failed');
}

async function callGeminiAPI(messages) {
  // Try all available Gemini keys until one works
  let lastError = null;
  const initialKeyIndex = currentGeminiKeyIndex;
  let keysTriedCount = 0;
  
  // Convert messages to Gemini format
  const geminiContents = [];
  
  // Add system message as a user message with [system] prefix
  const systemMessage = messages.find(msg => msg.role === 'system');
  if (systemMessage) {
    geminiContents.push({
      role: 'user',
      parts: [{ text: `[system] ${systemMessage.content}` }]
    });
  }
  
  // Add the rest of the messages
  for (const msg of messages) {
    if (msg.role !== 'system') {
      geminiContents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }
  
  while (keysTriedCount < GEMINI_API_KEYS.length) {
    try {
      // Import Gemini API dynamically
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      // Initialize Gemini API
      const genAI = new GoogleGenerativeAI(getCurrentGeminiKey());
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Create chat session
      const chat = model.startChat({
        history: geminiContents.slice(0, -1), // All messages except the last one
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });
      
      // Send the last message to get a response
      const lastMessage = geminiContents[geminiContents.length - 1];
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      const response = result.response;
      
      // Check for empty response
      if (!response || !response.text()) {
        // Try next key
        lastError = new Error('Empty response from Gemini API');
        getNextGeminiKey();
        keysTriedCount++;
        console.log(`Gemini API key ${currentGeminiKeyIndex + 1}/${GEMINI_API_KEYS.length} returned empty response`);
        continue;
      }
      
      // Success! Return the response
      return response.text();
      
    } catch (error) {
      // Try next key
      lastError = error;
      getNextGeminiKey();
      keysTriedCount++;
      console.log(`Gemini API key ${currentGeminiKeyIndex + 1}/${GEMINI_API_KEYS.length} error: ${error.message}`);
    }
  }
  
  // If we get here, all keys failed
  throw lastError || new Error('All Gemini API keys failed');
}

async function callChatGPTAPI(messages) {
  // Try all available ChatGPT keys until one works
  let lastError = null;
  const initialKeyIndex = currentChatGPTKeyIndex;
  let keysTriedCount = 0;
  
  while (keysTriedCount < CHATGPT_API_KEYS.length) {
    try {
      // Import OpenAI API directly - using new SDK version
      const OpenAI = (await import('openai')).default;
      
      // Initialize OpenAI API with new SDK format
      const openai = new OpenAI({ 
        apiKey: getCurrentChatGPTKey(),
        baseURL: 'https://free.v36.cm/v1',
        dangerouslyAllowBrowser: true // Add this option to bypass safety check
      });
      
      // Call ChatGPT API with new SDK format
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: messages,
        max_tokens: 500 // Reduced from 1000 to make responses shorter
      });
      
      // Check for empty response
      if (!completion || !completion.choices || !completion.choices[0] || !completion.choices[0].message) {
        // Try next key
        lastError = new Error('Empty response from ChatGPT API');
        getNextChatGPTKey();
        keysTriedCount++;
        console.log(`ChatGPT API key ${currentChatGPTKeyIndex + 1}/${CHATGPT_API_KEYS.length} returned empty response`);
        continue;
      }
      
      // Success! Return the response
      return completion.choices[0].message.content;
      
    } catch (error) {
      // Try next key
      lastError = error;
      getNextChatGPTKey();
      keysTriedCount++;
      console.log(`ChatGPT API key ${currentChatGPTKeyIndex + 1}/${CHATGPT_API_KEYS.length} error: ${error.message}`);
    }
  }
  
  // If we get here, all keys failed
  throw lastError || new Error('All ChatGPT API keys failed');
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if the message is in an active channel
  const channelConfig = activeChannels.get(message.channelId);
  if (!channelConfig) return;

  // Show typing indicator immediately
  await message.channel.sendTyping();

  // Check for YouTube URLs or search queries
  const youtubeUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]+)/i;
  const youtubeUrlMatch = message.content.match(youtubeUrlRegex);

  if (youtubeUrlMatch && youtubeUrlMatch[1]) {
    const videoId = youtubeUrlMatch[1];
    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: process.env.YOUTUBE_API_KEY
      });
      const response = await youtube.videos.list({
        part: 'snippet,statistics',
        id: videoId
      });
      if (response.data.items && response.data.items.length > 0) {
        const video = response.data.items[0];
        const embed = {
          color: 0xFF0000,
          title: video.snippet.title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          author: {
            name: video.snippet.channelTitle,
            url: `https://www.youtube.com/channel/${video.snippet.channelId}`
          },
          description: video.snippet.description.substring(0, 200) + (video.snippet.description.length > 200 ? '...' : ''),
          thumbnail: { url: video.snippet.thumbnails.medium.url },
          fields: [
            { name: '觀看次數', value: video.statistics.viewCount ? parseInt(video.statistics.viewCount).toLocaleString() : 'N/A', inline: true },
            { name: '喜歡人數', value: video.statistics.likeCount ? parseInt(video.statistics.likeCount).toLocaleString() : 'N/A', inline: true },
          ],
          timestamp: new Date(video.snippet.publishedAt),
          footer: { text: 'YouTube' }
        };
        await message.channel.send({ embeds: [embed] });
        
        // 修改：不要直接返回，而是將影片信息添加到消息中，讓AI處理
        const videoInfo = {
          title: video.snippet.title,
          channel: video.snippet.channelTitle,
          description: video.snippet.description.substring(0, 200) + (video.snippet.description.length > 200 ? '...' : '')
        };
        
        // 將原始消息內容修改為包含影片信息
        message.content = `${message.content}\n\n[YouTube Video Information: Title: "${videoInfo.title}", Channel: "${videoInfo.channel}", Description: "${videoInfo.description}"]`;
        
        // 繼續處理消息，不要返回
      }
    } catch (error) {
      console.error('Error fetching YouTube video by URL:', error);
      // Continue to AI response if fetching fails
    }
  }

  // Keywords to detect YouTube search intent
  const youtubeSearchKeywords = ['youtube', '影片', 'yt', '找影片', '搜影片'];
  const containsYoutubeKeyword = youtubeSearchKeywords.some(keyword => message.content.toLowerCase().includes(keyword));

  if (containsYoutubeKeyword && process.env.YOUTUBE_API_KEY) {
    let searchQuery = message.content;
    // Attempt to extract a more specific query if possible
    // This is a simple heuristic, can be improved
    youtubeSearchKeywords.forEach(keyword => {
      searchQuery = searchQuery.replace(new RegExp(keyword, 'gi'), '').trim();
    });
    if (searchQuery.length > 2) { // Avoid overly broad or empty searches
      try {
        const youtube = google.youtube({
          version: 'v3',
          auth: process.env.YOUTUBE_API_KEY
        });
        const searchResponse = await youtube.search.list({
          part: 'snippet',
          q: searchQuery,
          maxResults: 3, // Show fewer results for natural language queries
          type: 'video'
        });

        if (searchResponse.data.items && searchResponse.data.items.length > 0) {
          const videos = searchResponse.data.items.map(item => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            channelTitle: item.snippet.channelTitle
          }));
          const embed = {
            color: 0xFF0000,
            title: `我找到了這些 YouTube 影片給你參考看看：${searchQuery}`,
            description: videos.map((video, index) => `${index + 1}. [${video.title}](${video.url}) - ${video.channelTitle}`).join('\n'),
            thumbnail: { url: 'https://www.youtube.com/s/desktop/28b0985e/img/favicon_144x144.png' }
          };
          await message.channel.send({ embeds: [embed] });
          
          // 修改：不要直接返回，而是將搜索結果添加到消息中，讓AI處理
          const videoInfoText = videos.map((video, index) => 
            `Video ${index + 1}: "${video.title}" by ${video.channelTitle}`
          ).join('\n');
          
          // 將原始消息內容修改為包含搜索結果
          message.content = `${message.content}\n\n[YouTube Search Results for "${searchQuery}":\n${videoInfoText}]`;
          
          // 繼續處理消息，不要返回
        }
      } catch (error) {
        console.error('Error searching YouTube via natural language:', error);
        // Continue to AI response if search fails
      }
    }
  }
  
  // Check if the message is a reply to another message
  let replyContext = "";
  let isReply = false;
  
  if (message.reference && message.reference.messageId) {
    try {
      // Fetch the message being replied to
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMessage) {
        isReply = true;
        // 不再添加回覆前綴，只在控制台記錄
        console.log(`Detected reply to message: ${repliedMessage.content}`);
      }
    } catch (error) {
      console.error('Error fetching replied message:', error);
    }
  }

  // Get message history (last 50 messages)
  const messages = await message.channel.messages.fetch({ limit: 50 });
  const messageHistory = Array.from(messages.values())
    .reverse()
    .map(msg => ({
      role: msg.author.bot ? 'assistant' : 'user',
      content: `${msg.author.username}: ${msg.content}`,
      author: msg.author.username,
      isReply: msg.reference ? true : false,
      replyTo: msg.reference ? msg.reference.messageId : null
    }));

  // If this is a reply, find the original message and add context
  if (isReply) {
    const repliedMessage = messageHistory.find(m => m.id === message.reference.messageId);
    if (repliedMessage) {
      message.content = `(回覆 ${repliedMessage.author}) ${message.content}`;
    }
  }

  // Update channel's message history with proper user identification
  channelConfig.messageHistory = messageHistory.filter(msg => 
    msg.author !== client.user.username
  );
  
  // Process with selected API
  try {
    // Add personality prompt as system message
    const formattedMessages = [
      { role: 'system', content: setsunaPersonality },
      ...messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];
    
    // Get channel's preferred model or use default
    const preferredModel = channelModelPreferences.get(message.channelId) || defaultModel;
    
    // Variables to track response
    let response = null;
    let modelUsed = '';
    let fallbackUsed = false;
    
    // Try preferred model first
    switch (preferredModel) {
      case 'deepseek':
        if (DEEPSEEK_API_KEYS.length > 0) {
          try {
            response = await callDeepseekAPI(formattedMessages);
            modelUsed = 'DeepSeek';
          } catch (error) {
            console.log('DeepSeek API error:', error.message);
            // Will fall back to other models
          }
        }
        break;
        
      case 'gemini':
        if (GEMINI_API_KEYS.length > 0) {
          try {
            response = await callGeminiAPI(formattedMessages);
            modelUsed = 'Gemini';
          } catch (error) {
            console.log('Gemini API error:', error.message);
            // Will fall back to other models
          }
        }
        break;
        
      case 'chatgpt':
        if (CHATGPT_API_KEYS.length > 0) {
          try {
            response = await callChatGPTAPI(formattedMessages);
            modelUsed = 'ChatGPT';
          } catch (error) {
            console.log('ChatGPT API error:', error.message);
            // Will fall back to other models
          }
        }
        break;
        
      case 'groq':
        if (GROQ_API_KEYS.length > 0) {
          try {
            response = await callGroqAPI(formattedMessages, message.channelId);
            const groqModel = channelGroqModelPreferences.get(message.channelId) || defaultGroqModel;
            modelUsed = `Groq (${groqModel})`;
          } catch (error) {
            console.log('Groq API error:', error.message);
            // Will fall back to other models
          }
        }
        break;
        
      case 'together':
        if (TOGETHER_API_KEYS.length > 0) {
          try {
            response = await callTogetherAPI(formattedMessages);
            modelUsed = 'Together AI';
          } catch (error) {
            console.log('Together API error:', error.message);
            // Will fall back to other models
          }
        }
        break;
    }
    
    // If preferred model failed, try other models as fallback
    if (!response) {
      fallbackUsed = true;
      
      // Try Groq API if not already tried and keys are available
      if (!response && preferredModel !== 'groq' && GROQ_API_KEYS.length > 0) {
        try {
          response = await callGroqAPI(formattedMessages, message.channelId);
          const groqModel = channelGroqModelPreferences.get(message.channelId) || defaultGroqModel;
          modelUsed = `Groq (${groqModel})`;
        } catch (error) {
          console.log('Groq API fallback error:', error.message);
        }
      }
      
      // Try Gemini API if not already tried and keys are available
      if (!response && preferredModel !== 'gemini' && GEMINI_API_KEYS.length > 0) {
        try {
          response = await callGeminiAPI(formattedMessages);
          modelUsed = 'Gemini';
        } catch (error) {
          console.log('Gemini API fallback error:', error.message);
        }
      }
      
      // Try ChatGPT API if not already tried and keys are available
      if (!response && preferredModel !== 'chatgpt' && CHATGPT_API_KEYS.length > 0) {
        try {
          response = await callChatGPTAPI(formattedMessages);
          modelUsed = 'ChatGPT';
        } catch (error) {
          console.log('ChatGPT API fallback error:', error.message);
        }
      }
      
      // Try Together API if not already tried and keys are available
      if (!response && preferredModel !== 'together' && TOGETHER_API_KEYS.length > 0) {
        try {
          response = await callTogetherAPI(formattedMessages);
          modelUsed = 'Together AI';
        } catch (error) {
          console.log('Together API fallback error:', error.message);
        }
      }
      
      // Try DeepSeek API if not already tried and keys are available (last resort)
      if (!response && preferredModel !== 'deepseek' && DEEPSEEK_API_KEYS.length > 0) {
        try {
          response = await callDeepseekAPI(formattedMessages);
          modelUsed = 'DeepSeek';
        } catch (error) {
          console.log('DeepSeek API fallback error:', error.message);
        }
      }
    }
    
    // If all models failed or returned empty response
    if (!response) {
      throw new Error('All available models failed to generate a response');
    }
    
    // Refresh typing indicator
    await message.channel.sendTyping();
    
    // Send the response
    let finalResponse = response;
    
    // Add username context for replies
    if (isReply) {
      const repliedMessage = messageHistory.find(m => m.replyTo === message.reference?.messageId);
      if (repliedMessage) {
        finalResponse = `(回覆 ${repliedMessage.author}) ${response}`;
      }
    }
    
    // Always include the target username in direct responses
    if (!isReply) {
      finalResponse = `${message.author.username}，${response}`;
    }
    
    await message.reply(finalResponse);
    
    if (fallbackUsed) {
      console.log(`Response sent using ${modelUsed} model (fallback from ${preferredModel})`);
    } else {
      console.log(`Response sent using ${modelUsed} model`);
    }
    
  } catch (error) {
    console.error('Error generating response:', error);
    await message.channel.send('Sorry, I glitched out for a sec. Hit me up again later?');
  }
  },
),



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
