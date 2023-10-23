/**
 * TODO(developer):
 * Add your service key to the current folder.
 * Uncomment and fill in these variables.
 */
// const projectId = 'my-project';
// const locationId = 'global';
// const agentId = 'my-agent';
// const languageCode = 'en'
// const discordToken = '...'

const express = require("express");
const server = express();

const {Client, GatewayIntentBits} = require('discord.js');
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

bot.login(discordToken);
bot.on('ready', () => {console.log(`Logged in as ${bot.user.tag}!`)});

const structProtoToJson =
    require('../../botlib/proto_to_json.js').structProtoToJson;

// Imports the Google Cloud Some API library
const {SessionsClient} = require('@google-cloud/dialogflow-cx');

/**
 * Example for regional endpoint:
 *   const locationId = 'us-central1'
 *   const client = new SessionsClient({apiEndpoint:
 * 'us-central1-dialogflow.googleapis.com'})
 */
const client = new SessionsClient(
    {apiEndpoint: locationId + '-dialogflow.googleapis.com'});

/**
 * Converts Discord request to a detectIntent request.
 */
function discordToDetectIntent(discordRequest, sessionPath) {
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: discordRequest.content,
      },
      languageCode,
    },
  };

  return request;
}

/**
 * Takes as input a request from Discord and converts the request to
 * detectIntent request which is used to call the detectIntent() function
 * and finally output the response given by detectIntent().
 */
async function detectIntentResponse(discordRequest) {
  const sessionId = await discordRequest.author.id;
  const sessionPath = client.projectLocationAgentSessionPath(
      projectId, locationId, agentId, sessionId);

  request = discordToDetectIntent(discordRequest, sessionPath);
  const [response] = await client.detectIntent(request);
  return response;
};

async function convertToDiscordMessage(responses) {
  const exampleEmbed = {
    color: 0xff00e6,
    title: 'Shiba Bot',
    fields: [
      {
        name: 'Response',
        value: 'Some value here',
      },
      {
        name: 'Source',
        value: 'Some value here',
      },
    ],
  };

  for (const response of responses.queryResult.responseMessages) {
    if (response.hasOwnProperty('payload')) {
      const richContent = structProtoToJson(response.payload);
      if (richContent.richContent && richContent.richContent.length > 0) {
        const firstElement = richContent.richContent[0][0];
        if (firstElement && firstElement.actionLink) {
          exampleEmbed.fields[1].value = firstElement.actionLink;
        }
      }
    } else if (response.hasOwnProperty('text')) {
      exampleEmbed.fields[0].value = response.text.text.join();
    }
  }

  return exampleEmbed;
}

/**
 * The check at the beginning is required to make sure that the bot does
 * not respond to its own messages and that it only responds when users
 * directly ask it a question either through direct message or by mentioning
 * it in their message.
 */
bot.on('messageCreate', async function (message) {

  if (message.author != bot.user && !message.author.bot &&
      (message.mentions.users.has(bot.user.id) ||
       message.channel.type == 'DM')) {
    const responses = await detectIntentResponse(message);
    var requests = await convertToDiscordMessage(responses);

      try {
        console.log('Request : '+ JSON.stringify(requests));
        await message.channel.send({ embeds: [requests]});
      } catch (error) {
        console.log(error.data)
      }
  }
});

server.listen(process.env.PORT, () => {
  console.log(
      'Woo-hoo ,Your Dialogflow integration server is listening on port ' +
      process.env.PORT);
})

module.exports = {
  discordToDetectIntent,
  convertToDiscordMessage
};
