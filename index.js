import Discord from 'discord.js';
import config from './config.json' assert {type: 'json'}
import needle from 'needle';
import chara from './chara.json' assert {type: 'json'}
import Limiter from 'priority-limiter';

const { Util, Client, IntentsBits, IntentsBitField } = Discord

const myIntents = new IntentsBitField();
myIntents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildPresences, IntentsBitField.Flags.GuildMembers);

const client = new Client({ intents: myIntents });

client.login(config.token)

function sleep(ms) 
{
  return new Promise(resolve => setTimeout(resolve, ms));
}

function gptApi ()
{
	this.limiter = new Limiter(1, 32)
	this.limiter.awaitTurn()
	this.limiter.awaitTurn()

	this.headers =
		{
			'Content-Type'  : 'application/json',
			'Authorization' : 'Bearer ' + chara.password,
		}
	this.messageLog =
		[
			{'role' : 'system',
			 'content' : chara.prompt + ' ' + chara.jb}
		]

	this.data =
		{
			'model': chara.model, 
			'max_tokens': 425,
			'temperature': 0.9, 
			'frequency_penalty': 0.2,
			'presence_penalty': 0.1,
		}

	this.ping = async function (text)
	{
		const limit = await this.limiter.awaitTurn()
		this.data['messages'] = this.messageLog
		var response = {}
		try
		{
		response = await needle('post', chara.endpoint, this.data, {headers: this.headers})
		this.messageLog.push(response.body.choices[0].message)
		return response.body.choices[0].message
		}
		catch (error)
		{
			console.error(error)
			console.error(response.error)
			console.error(response.statusCode)
			console.error(response.body)
			console.error(this.data)
			console.error(this.data['messages'])
			return "beep error"
		}
	}

	this.contextAdd = function (text)
	{
		this.messageLog.push({'role' : 'user', 'content' : text})
		return
	}
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
		
		var files = []
		var embeds = []
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

function lalaBot (hooks)
{
	this.hooks = hooks
	this.gpt   = new gptApi()
	this.feed  = async function (m)
	{
		if(m.webhookId) return 


		if((Math.random() > 0.9 || (m.channel.name == "lala-general" && m.mentions.users.has( client.user.id))) && !m.author.bot)
		{
			await m.channel.sendTyping()
			const reply = await this.gpt.ping(m.author.displayName + ' : ' + Discord.cleanContent(m.content, m.channel).slice(13))
			m.reply(reply)
			return
		}
		else 
		{
			this.gpt.contextAdd(m.author.displayName + ' : ' + Discord.cleanContent(m.content, m.channel).slice(13))
		}
	}
}

	

const hookMan  = new HookManager()
const unperson = new Unpersonator(hookMan)
const scanners = new MessageScanners()
const bot      = new lalaBot()

scanners.add(unperson)
scanners.add(bot)

client.on('messageCreate', async message  =>  
{
	scanners.feed(message)
})

