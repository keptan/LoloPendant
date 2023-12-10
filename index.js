import Discord from 'discord.js';
import config from './config.json' assert {type: 'json'}
import proxy from './proxy.json' assert {type: 'json'}
import chara from './chara.json' assert {type: 'json'}
import {openAiProxy} from './openAiProxy.js'


//imports for discord permissions
const { Util, Client, IntentsBits, IntentsBitField } = Discord
const myIntents = new IntentsBitField();
myIntents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildPresences, IntentsBitField.Flags.GuildMembers);

//spawn client and read the client token out of the json folder
const client = new Client({ intents: myIntents });
client.login(config.token)

//ZzzzzzZZzzzz
function sleep(ms) 
{
  return new Promise(resolve => setTimeout(resolve, ms));
}

//manages hooks to all the channels we need
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
    return this.hooks.get(channel)
  }
}

//this is what we use to manage all our little bot systems
//that register themselves here, and then MessageScanner will propogate the messages to each system
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

//system used to anonimize all the posters inside a channel
function Unpersonator(hooks)
{
	this.hooks = hooks
	//get everyones names and profile pictures into the discord cache
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
		try
		{
			if(m.webhookId || m.channel.name != "anon") return
			
			//rip the embeds and files out of the post and then stick them into these variables
			var files = []
			var embeds = []
			if(m.attachments || m.embeds) await sleep(1000)

			//this seems to break a lot.... thats why we have this entire section encasaed in a try block..
			if(m.attachments)
			{
				for( let [k, i] of m.attachments)
				{
					files.push(Discord.AttachmentBuilder.from(i))
				}
			}

			if(m.embeds)
			{
				for( let [k, i] of m.embeds)
				{
					embeds.push(Discord.EmbedBuilder.from(i))
				}
			}

			//fetch our randomly chosen member to steal their name and avatar
			//fetch our hook to post the post into the anon channel
			const member = await this.populateNames(m.guild)
			const hook   = await this.hooks.retrieveHook(m.channel)

			hook.send(
				{
					content: m.content, 
					username: member.name, 
					avatarURL: member.uri,
					files: files,
					embeds: embeds,
				}).catch((error) => console.error(error))

			//wipe the original message from the channel
			m.delete()
		}
		catch (error) {console.error(error)}
	}
}

//call the openAiProxy with all our messages, and decide if we should save the context
//or just automatically reply
function lalaBot (hooks)
{
	this.hooks = hooks
	this.gpt   = new openAiProxy(proxy, chara)

	this.formatMessage = function ( message)
	{
		return message.author.displayName + ' : ' + Discord.cleanContent(message.content, message.channel)
	}

	this.ping = async function ( message)
	{
		await message.channel.sendTyping()
		const reply = await this.gpt.ping( this.formatMessage( message))
		message.reply(reply).catch( (error) => console.error( error))
	}

	this.reply = async function ( message)
	{
		const filteredPosters = new Set(['224350319725903874', '993850389273256049'])

		if(message.webhookId) return 
		if(message.content.length == 0) return
		if(message.author.id in filteredPosters) return 
		if(message.channel.name == 'anon' && Math.random() > 0.5)
		{
			this.ping( message)
			return 
		}

		if(Math.random() > 0.95)
		{
			this.ping( message)
			return 
		}

		this.gpt.contextAdd( this.formatMessage(message)) 
	}

	this.feed  = async function (m)
	{
		this.reply( m)
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

