const Discord = require('discord.js')
const myIntents = new Discord.Intents(Discord.Intents.NON_PRIVILEGED)
myIntents.add('GUILD_MEMBERS', 'GUILD_PRESENCES')
const client = new Discord.Client({forceFetchUsers: true, ws: { intents: myIntents }})
const config = require('./config.json')
const Markov = require('ez-markov')
const Eater  = require('discord-fetch-all')

client.login(config.token)

function sleep(ms) 
{
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

	this.add = function (s)
	{
		this.scanners.add(s)
	}

	this.remove = function (s)
	{
		this.scanners.remove(s)
	}
}

function MarkovKing (c, h)
{
	this.client = c
	this.hooks = h

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

	this.init = async function (client)
	{
		client.guilds.cache.forEach(async server => server.members.fetch())
		client.guilds.cache.forEach(async server => 
		{
			server.channels.cache.each(c => this.eatMessages(c))
		}
		)

	}

	this.post = async function (channel)
	{

			const post = this.generateMessage()
			const hook = await this.hooks.retrieveHook(channel)
			hook.send(post.message, {username: post.member.displayName, avatarURL: post.member.user.displayAvatarURL()}).catch(e => undefined)
	}


	this.feed = async function (m)
	{
		const split = m.content.split(' ')
		if(split[0] == '!rpost')
		{
			await this.post(m.channel)
			m.delete()
		}

		if(split[0] == '!wave')
		{
			postWave(this, m.channel)
		}
	}

}

async function postWave (m, c)
{
	for(var i = 0; i < Math.random() * 10; i++)
	{
		m.post(c)
		await sleep (Math.random() * 60)
	}
	await sleep( Math.random() * 60 * 60)
	postWave(m, c)
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
		if(m.webhookID) return 
		if(m.channel.name !== "hell") return
		const uris = [];
		m.attachments.forEach(a => {uris.push(a.proxyURL)})
		if(uris.length) await sleep(1000)

		const member = await this.populateNames(m.guild)
		const hook   = await this.hooks.retrieveHook(m.channel)
		hook.send(m.content, {files: uris, attatchments: m.attatchments, username: member.name, avatarURL: member.uri}).catch(e => undefined)
		m.delete()
	}
}

function Harass ()
{
	this.targets = new Map()

	this.add = function (s)
	{
		const split = s.split(' ')
		if(split[0] === '!harass') this.targets.set(split[1], split[2])
		if(split[0] === '!unharass') this.targets.delete(split[1])
	}

	this.feed = function (m)
	{
		this.add(m.content)
		if(this.targets.has(m.author.id))
		{
			m.react(this.targets.get(m.author.id))
		}
	}
}

const hookMan  = new HookManager()
const unperson = new Unpersonator(hookMan)
const scanners = new MessageScanners()
const markov   = new MarkovKing(client, hookMan)
const perv	   = new Harass()


scanners.add(unperson)
scanners.add(perv)
scanners.add(markov)

client.on('message', async message  =>  
{
	scanners.feed(message)
})

//setTimeout(scrambleAll, Math.random() * (1600 * 1000));
client.on('ready', async =>
	markov.init(client)
)

