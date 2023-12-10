import needle from 'needle';
import Limiter from 'priority-limiter';
import { isWithinTokenLimit } from 'gpt-tokenizer/model/gpt-4-32k'


function openAiProxy (proxyConfig, charaConfig)
{
	this.tokenLimit = proxyConfig.contextLimit
	this.limiter = new Limiter(1, 32)
	//this array holds the entire conversation context for our chat, 
	//it gets pruned randomly as it reaches the tokenLimit
	this.messageLog =
	[
		{
			'role' : 'system',
		 	'content' : charaConfig.prompt + ' ' + proxyConfig.jb
		}
	]

	//building our openAi header
	this.headers =
	{
		'Content-Type'  : 'application/json',
		'Authorization' : 'Bearer ' + proxyConfig.password,
	}

	//data header
	this.data =
	{
		'model': proxyConfig.model, 
		'max_tokens': 425,
		'temperature': 0.9, 
		'frequency_penalty': 0.2,
		'presence_penalty': 0.1,
	}

	//this function formats messages into the messageContext
	//also it prunes the messages if we reach the contextLimit
	this.contextAdd = function (text)
	{
		this.messageLog.push({'role' : 'user', 'content' : text + '\n'})
		while(!isWithinTokenLimit(this.messageLog, this.tokenLimit))
		{
			const index = Math.floor(Math.pow(Math.random(), 2) * (this.messageLog.length - 3)) + 1
			this.messageLog.splice(index, 1)
		}
		return
	}

	//function to reply to a discord message
	//takes text and returns text from the API
	//sends an HTTP request to openai endpoint
	//adjusts context
	//returns text
	this.ping = async function (text)
	{
		this.contextAdd(text)
		//we save the message from hitting the context so that it doesn't accidentally reply to an older message
		//from now on we will save the context even before we wait for the ratelimit too
		//messages we choose to reply to will now be in the context TWICE

		//wait for the rate limit
		const limit = await this.limiter.awaitTurn()
		this.contextAdd(text)
		var dataHeader = this.data
		dataHeader['messages'] = this.messageLog
		var response = {}
		try
		{
			response = await needle('post', proxyConfig.endpoint, dataHeader, {headers: this.headers})
			this.contextAdd(response.body.choices[0].message)
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
			this.messageLog =
				[
					{'role' : 'system',
					 'content' : charaConfig.prompt + ' ' + proxyConfig.jb}
				]
			return "beep error, message context is being perged!"

		}
	}
}

export {openAiProxy}
