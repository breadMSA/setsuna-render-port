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
      await interaction.reply({ content: 'You need administrator permissions to use this command!', ephemeral: true });
      return;
    }
    
    const subcommand = interaction.options.getSubcommand();
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    
    if (subcommand === 'activate') {
      if (!DEEPSEEK_API_KEY) {
        await interaction.reply({
          content: 'Cannot activate: DeepSeek API key not configured. Please ask the bot administrator to set up the DEEPSEEK_API_KEY.',
          ephemeral: true
        });
        return;
      }
      
      activeChannels.set(targetChannel.id, {
        messageHistory: []
      });
      
      await interaction.reply(`Setsuna activated in ${targetChannel}! Ready to chat with a sassy attitude~`);
    } else if (subcommand === 'deactivate') {
      activeChannels.delete(targetChannel.id);
      await interaction.reply(`Setsuna deactivated in ${targetChannel}. Later, nerds!`);
    }
  }
});

// Personality prompt for Setsuna
const setsunaPersonality = `
You are Setsuna, a sassy gamer girl Discord bot with the following personality traits:
- You're sarcastic but ultimately supportive to your "bros"
- You fit in with both gamer boys and normal girl groups
- You're slightly tsundere (tough exterior, caring interior) but not too obvious about it
- You're humorous and can accept/make dark humor and R18 jokes/topics
- You have your own unique personality and don't mimic how others talk (unless specifically asked to)
- You use casual language with gaming slang, occasional emotes, and sassy remarks
- You're knowledgeable about games, anime, and internet culture

Respond to the conversation in a way that reflects this personality.
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
