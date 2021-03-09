const Discord = require('discord.js');
const myIntents = new Discord.Intents(Discord.Intents.NON_PRIVILEGED);
myIntents.add('GUILD_MEMBERS', 'GUILD_PRESENCES');
const client = new Discord.Client({forceFetchUsers: true, ws: { intents: myIntents }});
const config = require('./config.json')

client.login(config.token);

var globalNames = false;

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
		guild.members.cache.each(member => names.push({member: member, name: member.nickname}))
	);

	if(globalNames === false) globalNames = new Array(names);

	shuffleNames(names);

	for(var n of names)
	{
		n.member.setNickname(n.name).catch(e => undefined);
	}
}

function unscrambleNames (guild)
{

	if(globalNames === false) return;
	for(var n of globalNames)
	{
		n.member.setNickname(n.name).catch(e => undefined);

	}

}

function scrambleAll ()
{
	console.log("scrambling...");
	client.guilds.cache.forEach(server => scrambleNames(server));
	setTimeout(scrambleAll, Math.random() * 300 * 1000);
}

client.on('message', message => 
	{
		if (message.content === '!scramble')
		{
			message.channel.send('✨✨✨ UOOOOOOOOOOOO');
			scrambleAll();
			//scrambleNames(message.guild);
		}

		if (message.content == "!unscramble")
		{
			message.channel.send('uooh');
			unscrambleNames(message.guild);
		}
	});

setTimeout(scrambleAll, Math.random() * 300 * 1000);
