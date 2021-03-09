const Discord = require('discord.js');
const myIntents = new Discord.Intents(Discord.Intents.NON_PRIVILEGED);
myIntents.add('GUILD_MEMBERS', 'GUILD_PRESENCES');
const client = new Discord.Client({forceFetchUsers: true, ws: { intents: myIntents }});
const config = require('./config.json')

client.login(config.token);

var hooks = new Map();

client.on("ready", async =>
	{
		client.guilds.cache.forEach(async server => server.members.fetch());
	});


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

		guild.members.cache.each(member => 
			{
			names.push({member: member, name: mmber.user.username})
			}
	));


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

async function populateNames (guild)
{

	var color, name, uri;
//	await guild.members.fetch();
	var member = await guild.members.cache.random();
	color = member.displayHexColor;
	name  = member.displayName;
	member = await guild.members.cache.random();
	uri   = member.user.displayAvatarURL();


	return {color: color, name: name, uri: uri};
}

async function fixNames (guild)
{
	await guild.members.fetch();
	guild.members.cache.each(m => m.setNickname(m.user.username).catch(e => undefined));
}




client.on('message', async message  =>  
	{
		if (message.webhookID) return;
		if (message.content === "!fixnames") return fixNames(message.guild);
		if (message.channel.name === "hell")
		{

			var uris = [];
			message.attachments.forEach(a => { uris.push(a.proxyURL)});

			const mysteryUser =  await populateNames(message.guild);
			console.log(mysteryUser);

			retrieveHook(message.channel).then(h => 
				h.send(message.content, {files: uris, attachments: message.attachments, color: mysteryUser.color , username: mysteryUser.name , avatarURL: mysteryUser.uri })
				.then(message.delete()));




		}
	});

//setTimeout(scrambleAll, Math.random() * (1600 * 1000));
