import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { data as createCommandData } from './commands/create';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Error: DISCORD_TOKEN and CLIENT_ID are required in environment variables.');
  process.exit(1);
}

const commands = [createCommandData.toJSON()];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`⏳ Started refreshing ${commands.length} application (/) commands.`);

    if (guildId) {
      // Guild-specific registration for fast testing
      console.log(`Guild ID detected: ${guildId}. Registering command to specific guild...`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
    } else {
      // Global registration
      console.log('No Guild ID detected. Registering commands globally...');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
    }

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
