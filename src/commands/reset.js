const { SlashCommandBuilder } = require('@discordjs/builders');
const DiscordTools = require('../discordTools/discordTools.js');
const { MessageAttachment } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset')
		.setDescription('Reset discord channels.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('discord')
				.setDescription('Reset discord channels.')),
	async execute(client, interaction) {
		let instance = client.readInstanceFile(interaction.guildId);

		if (instance.role !== null) {
			if (!interaction.member.permissions.has('ADMINISTRATOR') &&
				!interaction.member.roles.cache.has(instance.role)) {
				let role = DiscordTools.getRole(interaction.guildId, instance.role);
				await interaction.reply({
					content: `You are not part of the \`${role.name}\` role, therefore you can't run bot commands.`,
					ephemeral: true
				});
				client.log('INFO',
					`You are not part of the '${role.name}' role, therefore you can't run bot commands.`);
				return;
			}
		}

		await interaction.deferReply({ ephemeral: true });

		switch (interaction.options.getSubcommand()) {
			case 'discord': {
				const guild = DiscordTools.getGuild(interaction.guildId);

				instance.firstTime = true;
				client.writeInstanceFile(interaction.guildId, instance);

				let category = await require('../discordTools/SetupGuildCategory')(client, guild);
				await require('../discordTools/SetupGuildChannels')(client, guild, category);

				await require('../discordTools/SetupServerList')(client, guild);
				await require('../discordTools/SetupSettingsMenu')(client, guild);
				await require('../discordTools/SetupTrackers')(client, guild);

				instance = client.readInstanceFile(interaction.guildId);
				instance.informationMessageId.map = null;
				instance.informationMessageId.server = null;
				instance.informationMessageId.event = null;
				instance.informationMessageId.team = null;
				client.writeInstanceFile(interaction.guildId, instance);

				await DiscordTools.clearTextChannel(guild.id, instance.channelId.information, 100);

				let rustplus = client.rustplusInstances[guild.id];
				if (rustplus) {
					await rustplus.map.writeMap(false, true);

					let channel = DiscordTools.getTextChannelById(guild.id, instance.channelId.information);

					if (!channel) {
						client.log('ERROR', 'Invalid guild or channel.', 'error');
					}
					else {
						instance = client.readInstanceFile(guild.id);

						let file = new MessageAttachment(`src/resources/images/maps/${guild.id}_map_full.png`);
						let msg = await client.messageSend(channel, { files: [file] });
						instance.informationMessageId.map = msg.id;
						client.writeInstanceFile(guild.id, instance);
					}
				}

				await interaction.editReply({
					content: ':white_check_mark: Discord Reset.',
					ephemeral: true
				});
				client.log('INFO', 'Discord Reset.');
			} break;

			default: {
			} break;
		}
	},
};
