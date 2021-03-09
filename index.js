const Discord = require('discord.js');
const myIntents = new Discord.Intents(Discord.Intents.NON_PRIVILEGED);
myIntents.add('GUILD_MEMBERS', 'GUILD_PRESENCES');
const client = new Discord.Client({forceFetchUsers: true, ws: { intents: myIntents }});
const config = require('./config.json')

client.login(config.token);

var hooks = new Map();

function shuffleNames (array)
{
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i].name;
        array[i].name = array[j].name;
        array[j].name = temp;
    }
}

function scrambleNames (guild)
{
	const names = new Array();

	guild.members.fetch().then
	(
		guild.members.cache.each(member => names.push({member: member, name: member.user.username}))
	);


	shuffleNames(names);

	for(var n of names)
	{
		n.member.setNickname(n.name).catch(e => undefined);
	}
}

function unscrambleNames (guild)
{
}

function scrambleAll ()
{
	console.log("scrambling...");
	client.guilds.cache.forEach(server => scrambleNames(server));
	setTimeout(scrambleAll, Math.random() * (1600 * 1000));
}

async function retrieveHook (channel)
{
	if(hooks.has(channel)) return hooks.get(channel);

	ret = await channel.fetchWebhooks();
	if(!ret.size)
	{
		await channel.createWebhook('loloHook');
	}
	ret = await channel.fetchWebhooks();
	hooks.set(channel, ret.first());

	return hooks.get(channel);
}


client.on('message', message => 
	{
		if (message.webhookID) return;
		if (message.content === '!scramble')
		{
			message.channel.send('✨✨✨ UOOOOOOOOOOOO');

			retrieveHook(message.channel).then(h => 
				h.send(message.content, {embeds: message.embeds, username: message.author.username, avatarURL: message.author.displayAvatarURL() })); 



			scrambleAll();
		}

		if (message.content == "!unscramble")
		{
			unscrambleNames(message.guild);
		}
	});

setTimeout(scrambleAll, Math.random() * (1600 * 1000));
