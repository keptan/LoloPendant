import Discord from 'discord.js';
import config from './config.json' assert {type: 'json'}
import proxy from './proxy.json' assert {type: 'json'}
import chara from './chara.json' assert {type: 'json'}
import {CContext, OpenAiProxy} from './openAiProxy.js'
import {readChar} from './fileRead.js'


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
	this.gpt   = new OpenAiProxy(proxy, chara)

	this.generalBot = new CContext( readChar('./yume.png'))
	this.rpBot	     = new CContext( readChar('./yume.png'), 'https://files.catbox.moe/6iwc1p.png')
	this.rena	     = new CContext( readChar('./yuki.png'), 'https://files.catbox.moe/pk102u.png')

	this.gpt.initChara( this.rpBot)
	this.gpt.initChara( this.generalBot)
	this.gpt.initChara( this.rena)

	this.channelIndex = new Map()
	this.channelIndex.set('general', this.generalBot)
	this.channelIndex.set('lala-general', this.rpBot)
	this.channelIndex.set('rena', this.rena)

	/*
	const guild = await client.guilds.fetch('1084884995442741378')
	let channels = await guilds.channels.fetch() 
	*/

	this.formatMessage = function ( message)
	{
		return message.author.displayName + ' : ' + Discord.cleanContent(message.content, message.channel)
	}

	this.ping = async function ( charaConfig, message)
	{
		await message.channel.sendTyping()
		const reply = await this.gpt.ping( charaConfig, this.formatMessage( message))
		//message.reply(reply).catch( (error) => console.error( error))

		console.log(reply) 

		const hook   = await this.hooks.retrieveHook(message.channel)
		hook.send(
			{
				content: reply.content, 
				username: charaConfig.charaConfig.name, 
				avatarURL: charaConfig.avatar,
			}).catch((error) => console.error(error))
	}

	this.reply = async function ( message)
	{
		const filteredPosters = new Set(['224350319725903874', '_993850389273256049'])
		const favoredPosters  = new Set(['1175216131020177489','915327034518020127']) 

		if(!this.channelIndex.has( message.channel.name)) return 

		console.log( message.channel.name + ' ' + this.channelIndex.get( message.channel.name).charaConfig.name)
		if(message.author.bot) return 
		if(message.content.length == 0) return
		if(filteredPosters.has( message.author.id)) return 


		if(message.channel.name == 'lala-general')
		{
			if(message.mentions.users.has( client.user.id) /* && Math.random() > 0.3 */)
			{
				this.ping( this.channelIndex.get( message.channel.name), message)
				return 
			}
		}

		if(message.mentions.users.has( client.user.id) /* && favoredPosters.has( message.author.id)*/)
		{
			this.ping( this.channelIndex.get( message.channel.name), message)
			return
		}

		/*
		if(message.channel.name == 'lala-general' && Math.random() > 0.5)
		{
			this.ping( message)
			return 
		}
		*/

		if(Math.random() > 0.94)
		{
			this.ping( this.channelIndex.get( message.channel.name), message)
			return 
		}

		this.gpt.contextAdd( this.channelIndex.get( message.channel.name), this.formatMessage(message)) 
	}

	this.feed  = async function (m)
	{
		this.reply( m)
	}
}

const hookMan  = new HookManager()
const unperson = new Unpersonator(hookMan)
const scanners = new MessageScanners()
const bot      = new lalaBot(hookMan)

scanners.add(unperson)
scanners.add(bot)

client.on('messageCreate', async message  =>  
{
	scanners.feed(message)
})

