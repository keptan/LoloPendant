const Discord = require('discord.js')
const myIntents = new Discord.Intents(Discord.Intents.NON_PRIVILEGED)
myIntents.add('GUILD_MEMBERS', 'GUILD_PRESENCES')
const client = new Discord.Client({forceFetchUsers: true, ws: { intents: myIntents }})
const config = require('./config.json')
const Markov = require('ez-markov')
const Eater  = require('discord-fetch-all')

client.login(config.token)


function HookManager ()
{
	this.hooks = new Map()

	this.retrieveHook =  async function (channel)
	{
		if(this.hooks.has(channel)) return this.hooks.get(channel)

		var ret = await channel.fetchWebhooks()

		if(!ret.size)
		{
			await channel.createWebhook('loloHook')
		}

		this.hooks.set(channel, ret.first())

		return this.hooks.get(channel)
	}
}


function MessageScanners ()
{
	this.scanners = new Set()

	this.feed = function (m)
	{
		for (const s of this.scanners)
		{
			s.feed(m)
		}
	}
}

function MarkovKing (c)
{
	this.client = c
	this.channelsEaten = new Set()
	this.generators	= new Map()

	this.eatMessages = async function eatMessages (channel)
	{
		if(!channel.isText()) return
		if(this.channelsEaten.has(channel)) return
		this.channelsEaten.add(channel)

		const allMessages = await Eater.messages(channel, {userOnly: true})

		for (const m of allMessages)
		{
			if(!this.generators.has(m.member)) this.generators.set(m.member, new Markov())
			const gen = this.generators.get(m.member)
			if(m.content)
			{
				gen.addCorpus(m.content.replace(/(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)/, ''))
			}
		}
	}


	this.generateMessage = function ()
	{
		let index = Math.floor(Math.random() * this.generators.size)
		let acc = 0
		for(let key of this.generators.keys())
		{
			if (acc++ === index) return {member: key, message: this.generators.get(key).getSentence()}
		}
	}
}

function Unpersonator(hooks)
{
	this.hooks = hooks
	this.populateNames = async function (guild)
	{
		var name, uri
		var member = await guild.members.cache.random()
		name = member.displayName
		member = await guild.members.cache.random()
		uri  = member.user.displayAvatarURL()

		return {name: name, uri: uri}
	}

	this.feed = async function (m)
	{
		const uris = [];
		m.attatchments.forEach(a => {uris.push(a.proxyURL)})

		const member = await this.populateNames(m.guild)
		const hook   = await this.hooks.retrieveHook(m.channel)
		hook.send(m.content, {files: uris, attatchments: m.attatchments, username: member.name, avatarURL: member.uri})
	}
}

const hookMan  = new HookManager()
const unperson = new Unpersonator(hookMan)
const scanners = new MessageScanners()

scanners.add(unperson)

client.on('message', async message  =>  
{
	scanners.feed(message)
})

/*
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
*/

