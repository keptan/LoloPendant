const Discord = require('discord.js');
const myIntents = new Discord.Intents(Discord.Intents.NON_PRIVILEGED);
myIntents.add('GUILD_MEMBERS', 'GUILD_PRESENCES');
const client = new Discord.Client({forceFetchUsers: true, ws: { intents: myIntents }});
const config = require('./config.json')
const Markov = require('ez-markov')
const Eater  = require('discord-fetch-all')

client.login(config.token);

var hooks = new Map();
var generators = new Map();
var channelsEaten = new Set();

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


function MarkovKing (c)
{
	const channelsEaten = new Set();
	const generators	= new Map();

	async function eatMessages (channel)
	{
		if(!channel.isText()) return;
		if(this.channelsEaten.has(channel)) return; 
		this.channelsEaten.add(channel);

		const allMessages = await Eater.messages(channel, {userOnly: true});

		for (const m of allMessages)
		{
			if(!this.generators.has(m.member)) this.generators.set(m.member, new Markov());
			const gen = this.generators.get(m.member);
			if(m.content)
			{
				gen.addCorpus(m.content.replace(/(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)/, ""));
			}
		}
	}


	function generateMessage ()
	{
		let index = Math.floor(Math.random() * generators.size);
		let acc = 0;
		var key;
		for(let key of this.generators.keys())
		{
			if (acc++ === index) return {member: key, message: this.generators.get(key).getSentence()};
		}
	}
};





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



async function spamPost ()
{
	for(var channel of channelsEaten)
	{

		if(channel.name !== "hell") continue;
	
		setTimeout(spamPost, Math.random() * (1460 * 1000));
		const rMessage = generateMessage();	
		if(rMessage.message === "") return;

		 retrieveHook(channel).then(h =>
			h.send(rMessage.message, {username: rMessage.member.displayName, avatarURL: rMessage.member.user.displayAvatarURL()})).catch(e => undefined);

	}
}






client.on('message', async message  =>  
	{
		if (message.webhookID) return;
		
		if (!generators.has(message.member))
		{
			generators.set(message.member, new Markov());
		}

		const gen = generators.get(message.member);
		if(message.content)
		{
			gen.addCorpus(message.content.replace(/(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)/, ""));
		}

		if (message.content === "!test")
		{
			spamPost();
			return;
		}


		if (message.channel.name === "hell")
		{

			var uris = [];
			message.attachments.forEach(a => { uris.push(a.proxyURL)});

			const mysteryUser =  await populateNames(message.guild);
			console.log(mysteryUser);

			retrieveHook(message.channel).then(h => 
				h.send(message.content, {files: uris, attachments: message.attachments, color: mysteryUser.color , username: mysteryUser.name , avatarURL: mysteryUser.uri })
				.then(wait(4000).then(message.delete())));
		}

		if( message.channel.name == "hell" && Math.random() > 0.90)
		{
			const rMessage = generateMessage();	
			wait(Math.random() * (2600 * 1000)).then( () => retrieveHook(message.channel).then(h =>
				h.send(rMessage.message, {username: rMessage.member.displayName, avatarURL: rMessage.member.user.displayAvatarURL()}))).catch(e => undefined);
		}
	});

//setTimeout(scrambleAll, Math.random() * (1600 * 1000));
client.on("ready", async =>
	{
		client.guilds.cache.forEach(async server => server.members.fetch());
		client.guilds.cache.forEach(async server => 
			{
				server.channels.cache.each(c => eatMessages(c))
				setTimeout(spamPost, 3000);
				console.log("ready!");
			}
		);

	});

