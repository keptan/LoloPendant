import needle from 'needle';
import Limiter from 'priority-limiter';
import { isWithinTokenLimit } from 'gpt-tokenizer/model/gpt-4-32k'

import extract from 'png-chunks-extract'
import text from 'png-chunk-text'
import fs from 'fs'


function OpenAiProxy ( proxyConfig)
{
	this.tokenLimit = proxyConfig.contextLimit
	this.limiter = new Limiter(1, 32)

	this.headers =
	{
		'Content-Type'  : 'application/json',
		'Authorization' : 'Bearer ' + proxyConfig.password,
	}

	//data header
	this.data =
	{
		'model': proxyConfig.model, 
		'max_tokens': 300,
		'temperature': 0.9, 
		'frequency_penalty': 0.2,
		'presence_penalty': 0.1,
	}

	this.initChara = function ( charaConfig)
	{
		charaConfig.messageLog.push(  
			{
					'role' : 'system',
					'content' : proxyConfig.jb + '\n' + charaConfig.charaConfig.char_persona
			})
		charaConfig.messageLog.push(
			{
					'role' : 'system',
					'content' : charaConfig.charaConfig.first_mes 
			})

		return charaConfig.charaConfig.first_mes
	}

	//this function formats messages into the messageContext
	//also it prunes the messages if we reach the contextLimit
	this.contextAdd = function (charaConfig, text)
	{
		charaConfig.messageLog.push({'role' : 'user', 'content' : text + '\n'})
		while(!isWithinTokenLimit(charaConfig.messageLog, this.tokenLimit))
		{
			const index = Math.floor(Math.pow(Math.random(), 2) * (charaConfig.messageLog.length - 3)) + 3
			charaConfig.messageLog.splice(index, 1)
		}
		return
	}

	//function to reply to a discord message
	//takes text and returns text from the API
	//sends an HTTP request to openai endpoint
	//adjusts context
	//returns text
	this.ping = async function (charaConfig, text)
	{
		this.contextAdd(charaConfig, text)
		//we save the message from hitting the context so that it doesn't accidentally reply to an older message
		//from now on we will save the context even before we wait for the ratelimit too
		//messages we choose to reply to will now be in the context TWICE

		//wait for the rate limit
		const limit = await this.limiter.awaitTurn()
		this.contextAdd(charaConfig, text)
		var dataHeader = this.data
		dataHeader['messages'] = charaConfig.messageLog
		var response = {}
		try
		{
			response = await needle('post', proxyConfig.endpoint, dataHeader, {headers: this.headers})
			this.contextAdd(charaConfig, response.body.choices[0].message)
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

			//reset thet entire context if we hit an error on openAi request...
			this.initChara( charaConfig)
			return "beep error, message context is being perged!"

		}
	}
}

function CContext ( charaConfig_, avatarUrl = 'https://files.catbox.moe/6iwc1p.png')
{
	console.log(charaConfig_.name + ' imported')
	this.charaConfig = charaConfig_
	this.messageLog = [] 
}


export {OpenAiProxy, CContext}
