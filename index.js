const Discord = require('discord.js')
const config = require('./config.json')

const { Client, IntentsBitField } = require('discord.js');

const myIntents = new IntentsBitField();
myIntents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildPresences, IntentsBitField.Flags.GuildMembers);

const client = new Client({ intents: myIntents });

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

		const fetch = await channel.fetchWebhooks()
		const found = fetch.first()
		if(found) return found

		this.hooks.set(channel, await channel.createWebhook({name: "loloPendant"}))
		
		console.log("4 reutrning webhook...")
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
		if(m.webhookId)
		{
			console.log("exiting feed because its recursive from a webhook or whatever")
			return 
		}
		if(m.channel.name !== "anon") return
		
		files = []
		embeds = []
		if(m.attachments)
		{
			//await sleep(1000)
		}

		for( [k, i] of m.attachments)
		{
			files.push(Discord.AttachmentBuilder.from(i))
		}

		for( [k, i] of m.embeds)
		{
			embeds.push(Discord.EmbedBuilder.from(i))
		}

		const member = await this.populateNames(m.guild)
		const hook   = await this.hooks.retrieveHook(m.channel)
	//	hook.send(m.content, {files: uris, attatchments: m.attatchments, username: member.name, avatarURL: member.uri}).catch(e => undefined)
		hook.send({
			content: m.content, 
			username: member.name, 
			avatarURL: member.uri,
			files: files,
			embeds: embeds,
		})
		m.delete()
	}
}

const hookMan  = new HookManager()
const unperson = new Unpersonator(hookMan)
const scanners = new MessageScanners()

scanners.add(unperson)

client.on('messageCreate', async message  =>  
{
	scanners.feed(message)
})

