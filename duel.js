/* 
  * This example does not use a database.
  * It serves to introduce the concept of the duel command.
  * Made it I don't know for whom, but use.
  * Caution below shitcode.
*/

// npm i @discordjs/builders --> Yes, this example will be on the discord.js builder)
const { SlashCommandBuilder } = require("@discordjs/builders");

// path to images.json file (The path will be prompted by ur IDE -> maybe)
const images = require("./images.json");
const duels = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Challenge the user to a duel")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Enter the username you want to challenge to a duel')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('bid')
        .setDescription('Enter your bet')
        .setRequired(true)
        .setMinValue(50)
        .setMaxValue(5000)
    ),
  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const bid = interaction.options.getInteger('bid');

    if (interaction.member.id === target.id || target.user.bot) {
      return interaction.reply({ content: "❌ | You **can't** play with **this user**." });
    }

    const hasDuel = duels.get(interaction.member.id)
    if (hasDuel) {
      const oldGuild = interaction.client.guilds.resolve(hasDuel.guildId);
      const oldChannel = oldGuild?.channels.resolve(hasDuel.channelId);
      const oldMessage = oldChannel?.messages.resolve(hasDuel.messageId);
      if(oldMessage) await oldMessage.delete();
      duels.delete(interaction.member.id);
    }

    interaction.reply({
      content: `|| ${target}> ||`, embeds: [
        {
          author: { name: `Duel — ${interaction.member.user.tag}`, iconURL: interaction.member.displayAvatarURL({dynamic: true}) },
          description: `**${target.displayName}**, you are challenged to a duel by a user **${interaction.member.displayName}**\nBID: **${bid}** coins`,
          thumbnail: { url: target.displayAvatarURL({ dynamic: true }) },
          image: { url: images.duel.start[Math.floor(Math.random() * images.duel.start.length)] },
          footer: { text: "Waiting for user response" },
          color: "YELLOW"
        }
      ], components: [{
        type: "ACTION_ROW",
        components: [
          {
            type: "BUTTON",
            label: "Accept Duel",
            emoji: "⚔️",
            customId: "duel",
            style: "SECONDARY",
          },
        ],
      }]
    })

    const msg = await interaction.fetchReply()
    const collector = await msg.createMessageComponentCollector({ time: 180000 });
    duels.set(interaction.member.id, { guildId: interaction.guild.id, messageId: msg.id, channelId: interaction.channel.id })

    collector.on("collect", (interplay) => {
      interplay.deferUpdate();
      if (interplay.member.id !== target.id) return
      duels.delete(interaction.member.id);
      let i = 3
      const interval = setInterval(() => {
        msg.edit({
          embeds: [generateTimeLessEmbed(interplay.message.embeds[0], i)],
          components: [],
        })
        i--
      }, 1000)

      setTimeout(() => {
        clearInterval(interval);
        const chance = Math.random()
        const winner = chance <= 0.52 ? interaction.member : target;
        const loser = chance >= 0.53 ? target : interaction.member;

        msg.edit({embeds: [
        {
          title: `Duel — ${interaction.member.user.tag}`,
          description: `**${winner.displayName}** won **${bid}** coins in a duel with **${loser.displayName}**`,
          thumbnail: {url: winner.displayAvatarURL({ dynamic: true })},
          image: { url: images.duel.end[Math.floor(Math.random() * images.duel.end.length)] },
          footer: { text: `${winner.user.tag} ・ The duel is over`, iconURL: winner.displayAvatarURL({ dynamic: true }) },
          color: "#2f3136",
        }]});
      }, 3500);
    })
    collector.on("end", () => {
      duels.delete(interaction.member.id)

      const updateMessage = interaction.channel.messages.resolve(msg.id)
      updateMessage?.edit({
        components: msg.components.map((row) => {
          row.components.forEach((button) => (button.disabled = true));
          return row;
        }),
      });
    });
  },
};

function generateTimeLessEmbed(embed, timeLess) {
  const newEmbedElements = {
    description: `Duel starts in ${timeLess--} sec.`,
    image: { url: images.duel.start[Math.floor(Math.random() * images.duel.start.length)] },
    thumbnail: null,
    color: "RANDOM"
  }
  return Object.assign(embed, newEmbedElements)
}