import needle from 'needle';
import Limiter from 'priority-limiter';
import { isWithinTokenLimit } from 'gpt-tokenizer/model/gpt-4-32k'


function openAiProxy (proxyConfig, charaConfig)
{
	this.tokenLimit = 15000;
	this.limiter = new Limiter(1, 32)
	this.messageLog = []


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

	this.contextAdd = function (text)
	{
		this.messageLog.push({'role' : 'user', 'content' : text + '\n'})
		while(!isWithinTokenLimit(this.messageLog, this.tokenLimit))
		{
			console.log("perging messages to make up for token length")
			const index = Math.floor(Math.pow(Math.random(), 2) * (this.messageLog.length - 3)) + 1
			this.messageLog.splice(index, 1)
		}
		return
	}




	this.ping = async function (text)
	{
		const limit = await this.limiter.awaitTurn()
		this.contextAdd(text)
		this.data['messages'] = this.messageLog
		var response = {}
		try
		{
		response = await needle('post', chara.endpoint, this.data, {headers: this.headers})
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

			this.messageLog =
				[
					{'role' : 'system',
					 'content' : chara.prompt + ' ' + chara.jb}
				]
			return "beep error"

		}
	}
}

export {openAiProxy}
