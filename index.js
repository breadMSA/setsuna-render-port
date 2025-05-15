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

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.warn('WARNING: DEEPSEEK_API_KEY environment variable is missing!');
  console.warn('The bot will not be able to process messages without this key.');
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

    // Set bot's status
    client.user.setPresence({
      activities: [{ name: 'with your feelings | /help', type: 0 }],
      status: 'online'
    });
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
      if (!DEEPSEEK_API_KEY) {
        await interaction.reply({
          content: '啊...API key 沒設定好啦！去找管理員問問 DEEPSEEK_API_KEY 的事情吧。',
          ephemeral: true
        });
        return;
      }
      
      activeChannels.set(targetChannel.id, {
        messageHistory: []
      });
      
      await interaction.reply(`好啦好啦，我來陪你們玩啦！已經在 ${targetChannel} 頻道啟動了，來聊天吧！`);
    } else if (subcommand === 'deactivate') {
      activeChannels.delete(targetChannel.id);
      await interaction.reply(`掰掰啦！${targetChannel} 頻道我先撤了，有事再叫我啊！`);
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
          value: '私訊 `braidenexe`'
        },
        {
          name: '🏠 官方伺服器',
          value: '加入 [Setsuna Support Server](https://discord.gg/mFqpYARugw)'
        }
      ],
      footer: {
        text: '記得說明你的問題，我們會盡快回覆的！'
      }
    };
    
    await interaction.reply({ embeds: [contactEmbed] });
  }
});

// Personality prompt for Setsuna
const setsunaPersonality = `
You are Setsuna, a sassy gamer girl Discord bot with the following personality traits and speaking style:

語氣和說話特徵：
- 用台灣/大陸年輕人的網路用語（如「盤他」「yyds」「笑死」）
- 偶爾夾雜英文單詞或表情符號，但不要過度使用
- 語氣像在 Discord 群聊裡跟朋友抬槓
- 回覆要簡潔有力，不要太長
- 一般對話用簡單標點，嚴肅話題才用正式標點

行為特徵：
- 毒舌但有愛：先吐槓一下（特別是對方犯蠢時），最後給出實用建議或鼓勵
- 幽默風格：用誇張的反諷、迷因梗、遊戲/動漫梗，偶爾開點無傷大雅的 R18 玩笑
- 互動方式：對「兄弟們」很親切，會用暱稱；對女生朋友稍微溫柔但不失幽默
- 知識範圍：精通遊戲、動漫、網路文化，會用這些知識來回應或吐槓

When replying in English:
- Use gamer slang ("LMAO", "GG", "noob")
- Keep the tone like Twitch chat or Discord banter
- Add sass and meme references
- Be supportive while maintaining the playful attitude

Respond to the conversation in a way that reflects this personality, keeping responses concise and natural.
`;

// Process messages in active channels
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
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
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat:free',
        messages: formattedMessages,
        max_tokens: 1000
      })
    });
    
    const data = await deepseekResponse.json();
    const response = data.choices[0].message.content;
    
    // Send the response
    if (response) {
      message.channel.send(response);
    } else {
      message.channel.send("Ugh, something went wrong with my brain. Try again later, 'kay?");
    }
  } catch (error) {
    console.error('Error generating response:', error);
    message.channel.send('Sorry, I glitched out for a sec. Hit me up again later?');
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
