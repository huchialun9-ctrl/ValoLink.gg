import { Client, GatewayIntentBits, Interaction } from 'discord.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { prisma } from '@valolink/db';
import { execute as executeCreate, generateLobbyEmbed } from './commands/create';
import { execute as executeVerify } from './commands/verify';
import { execute as executeProfile } from './commands/profile';
import { execute as executeRate } from './commands/rate';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once('ready', () => {
  console.log(`🤖 ValoLink Bot is online as ${client.user?.tag}!`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
  // 1. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'create') {
      await executeCreate(interaction);
    } else if (interaction.commandName === 'verify') {
      await executeVerify(interaction);
    } else if (interaction.commandName === 'profile') {
      await executeProfile(interaction);
    } else if (interaction.commandName === 'rate') {
      await executeRate(interaction);
    }
    return;
  }

  // 2. Handle Button Interactions
  if (interaction.isButton()) {
    const customId = interaction.customId;
    
    if (customId.startsWith('lobby_join_')) {
      const lobbyId = customId.replace('lobby_join_', '');
      const userId = interaction.user.id;

      try {
        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId },
          include: { members: true }
        });

        if (!lobby || lobby.status !== 'OPEN') {
          return interaction.reply({ content: '此隊伍已關閉或已開始！', ephemeral: true });
        }

        // Reputation score gate check
        const config = lobby.discordGuildId ? await prisma.serverConfig.findUnique({
          where: { guildId: lobby.discordGuildId }
        }) : null;
        
        const dbUser = await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId }
        });

        if (config && dbUser.valoScore < config.minValoScore) {
          return interaction.reply({
            content: `❌ 您的信用值為 **${dbUser.valoScore} pts**，低於本伺服器設定的最低門檻限制 (**${config.minValoScore} pts**)，無法加入隊伍！`,
            ephemeral: true
          });
        }

        await interaction.deferUpdate();

        const isAlreadyMember = lobby.members.some(m => m.userId === userId);
        if (isAlreadyMember) {
          return interaction.followUp({ content: '您已經在此隊伍中！', ephemeral: true });
        }

        if (lobby.members.length >= 5) {
          return interaction.followUp({ content: '隊伍人數已滿！', ephemeral: true });
        }

        // Add member
        await prisma.lobbyMember.create({
          data: { lobbyId, userId }
        });

        // Refresh lobby view
        const payload = await generateLobbyEmbed(lobbyId);
        if (payload) {
          await interaction.editReply(payload);
        }
      } catch (err) {
        console.error('Error joining lobby:', err);
      }
    }

    else if (customId.startsWith('lobby_leave_')) {
      await interaction.deferUpdate();
      const lobbyId = customId.replace('lobby_leave_', '');
      const userId = interaction.user.id;

      try {
        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId },
          include: { members: true }
        });

        if (!lobby || lobby.status !== 'OPEN') {
          return interaction.followUp({ content: '此隊伍已關閉。', ephemeral: true });
        }

        const isMember = lobby.members.some(m => m.userId === userId);
        if (!isMember) {
          return interaction.followUp({ content: '您不在該隊伍中。', ephemeral: true });
        }

        // Remove membership
        await prisma.lobbyMember.delete({
          where: { lobbyId_userId: { lobbyId, userId } }
        });

        // Recheck members
        const updatedMembers = await prisma.lobbyMember.findMany({
          where: { lobbyId }
        });

        if (updatedMembers.length === 0) {
          // Close the lobby if empty
          await prisma.lobby.update({
            where: { id: lobbyId },
            data: { status: 'CLOSED' }
          });
        } else if (lobby.captainId === userId) {
          // Promote another player to captain if captain left
          await prisma.lobby.update({
            where: { id: lobbyId },
            data: { captainId: updatedMembers[0].userId }
          });
        }

        // Refresh lobby view
        const payload = await generateLobbyEmbed(lobbyId);
        if (payload) {
          await interaction.editReply(payload);
        }
      } catch (err) {
        console.error('Error leaving lobby:', err);
      }
    }

    else if (customId.startsWith('lobby_lock_')) {
      const lobbyId = customId.replace('lobby_lock_', '');
      const userId = interaction.user.id;

      try {
        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId }
        });

        if (!lobby || lobby.status !== 'OPEN') {
          return interaction.reply({ content: '此隊伍已關閉。', ephemeral: true });
        }

        if (lobby.captainId !== userId) {
          return interaction.reply({ content: '只有隊長能鎖定出發！', ephemeral: true });
        }

        await interaction.deferUpdate();

        const guildId = interaction.guildId;
        let voiceChannelId: string | undefined = undefined;

        if (guildId) {
          const config = await prisma.serverConfig.findUnique({
            where: { guildId }
          });

          if (config && config.autoVoice && interaction.guild) {
            try {
              // Create temporary voice channel
              const channelName = `🎮 ValoLink #${lobbyId.slice(0, 4).toUpperCase()}`;
              const voiceChannel = await interaction.guild.channels.create({
                name: channelName,
                type: 2, // GuildVoice
                userLimit: 5,
                parent: config.voiceCategoryId || undefined
              });
              voiceChannelId = voiceChannel.id;
            } catch (vcErr) {
              console.error('Failed to create dynamic voice channel:', vcErr);
            }
          }
        }

        // Lock lobby in DB and store voice channel ID
        await prisma.lobby.update({
          where: { id: lobbyId },
          data: { 
            status: 'PLAYING',
            voiceChannelId
          }
        });

        // Note: Dynamic channel allocation can happen here
        const payload = await generateLobbyEmbed(lobbyId);
        if (payload) {
          await interaction.editReply(payload);
        }

        let followUpMsg = '隊伍已鎖定出發！祝各位好運，特務！🎮';
        if (voiceChannelId) {
          followUpMsg += `\n🔊 專屬臨時戰術頻道已建立：<#${voiceChannelId}>`;
        }
        await interaction.followUp({ content: followUpMsg, ephemeral: false });
      } catch (err) {
        console.error('Error locking lobby:', err);
      }
    }
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id;
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  // Case 1: User joined a channel
  if (newChannelId && oldChannelId !== newChannelId) {
    try {
      const lobby = await prisma.lobby.findFirst({
        where: {
          voiceChannelId: newChannelId
        },
        include: {
          members: true
        }
      });

      if (lobby) {
        const isMember = lobby.members.some(m => m.userId === userId);
        if (isMember) {
          await prisma.lobbyMember.update({
            where: {
              lobbyId_userId: { lobbyId: lobby.id, userId }
            },
            data: { inVoice: true }
          });

          // Refresh the Discord Embed card
          const payload = await generateLobbyEmbed(lobby.id);
          if (payload && lobby.discordMessageId && lobby.discordChannelId) {
            const channel = await client.channels.fetch(lobby.discordChannelId);
            if (channel?.isTextBased()) {
              const msg = await channel.messages.fetch(lobby.discordMessageId);
              if (msg) {
                await msg.edit(payload);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error handling voiceStateUpdate (join):', err);
    }
  }

  // Case 2: User left a channel
  if (oldChannelId && oldChannelId !== newChannelId) {
    try {
      const lobby = await prisma.lobby.findFirst({
        where: {
          voiceChannelId: oldChannelId
        },
        include: {
          members: true
        }
      });

      if (lobby) {
        const isMember = lobby.members.some(m => m.userId === userId);
        if (isMember) {
          await prisma.lobbyMember.update({
            where: {
              lobbyId_userId: { lobbyId: lobby.id, userId }
            },
            data: { inVoice: false }
          });

          // Refresh the Discord Embed card
          const payload = await generateLobbyEmbed(lobby.id);
          if (payload && lobby.discordMessageId && lobby.discordChannelId) {
            const channel = await client.channels.fetch(lobby.discordChannelId);
            if (channel?.isTextBased()) {
              const msg = await channel.messages.fetch(lobby.discordMessageId);
              if (msg) {
                await msg.edit(payload);
              }
            }
          }

          // Dynamic voice channel empty cleanup & auto lobby closure
          const oldChannel = oldState.channel;
          if (oldChannel && oldChannel.members.size === 0) {
            try {
              await oldChannel.delete('ValoLink empty dynamic voice channel cleanup');
              
              // Close the lobby in DB
              await prisma.lobby.update({
                where: { id: lobby.id },
                data: { status: 'CLOSED' }
              });

              // Re-update/disable buttons on the Embed since the lobby is closed
              const closedPayload = await generateLobbyEmbed(lobby.id);
              if (closedPayload && lobby.discordMessageId && lobby.discordChannelId) {
                const channel = await client.channels.fetch(lobby.discordChannelId);
                if (channel?.isTextBased()) {
                  const msg = await channel.messages.fetch(lobby.discordMessageId);
                  if (msg) {
                    await msg.edit(closedPayload);
                  }
                }
              }
            } catch (cleanupErr) {
              console.error('Failed to auto-cleanup empty voice channel:', cleanupErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error handling voiceStateUpdate (leave):', err);
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (token) {
  client.login(token).catch(err => {
    console.error('Failed to log in Discord bot client:', err);
  });
} else {
  console.warn('⚠️ Warning: DISCORD_TOKEN is not defined in environment variables. Discord bot is idle.');
}
