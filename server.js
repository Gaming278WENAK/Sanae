const Discord = require("discord.js");
const superagent = require("superagent");
const YouTube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
const opus = require("opusscript");
 
const PREFIX = 's!';
var commandcooldown = new Set();
var queue = new Map();
 
var bot = new Discord.Client({
    fetchAllMembers: true
})
var youtube = new YouTube(process.env.YTAPI);

bot.on("ready", async () => {
    console.log(`${bot.user.tag} Was Booted UP!`)
})
 
bot.on('message', async msg => { // eslint-disable-line
    var message = msg;
 
    if (message.author.bot) return;
 
    if (message.channel.type === 'dm') return;
 
    var DEFAULTPREFIX = 's!'
 
    var {body} = await superagent
        .get("https://exampleno1.glitch.me/prefixes.json")
    
    if (!body[message.guild.id]) {
        body[message.guild.id] = {
            prefixes: DEFAULTPREFIX
        };
    }
 
    var PREFIX = body[message.guild.id].prefixes
 
    if (msg.author.bot) return undefined;
    if (!msg.content.startsWith(PREFIX)) return undefined;
 
  var randomhexcolor = 0xFF0000
 
  const args = msg.content.split(' ');
	
	//const searchString = args.slice(1).join(' ');
	
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(PREFIX.length)
    if (command === 'play') {
        var searchString = args.slice(1).join(" ");
        if(!searchString) return msg.channel.send({embed: {
          color: randomhexcolor,
          description: `The correct usage is: \`${PREFIX}play [Song Name]/[Video URL]/[Playlist URL]\``
        }})
        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `You're not in the **Voice Channel**, go Join some!`
            }
        })
        const permissions = voiceChannel.permissionsFor(bot.user);
        if (!permissions.has('CONNECT')) {
              msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: "OOPS..! I lack the **`CONNECT` Permission** on those Channels."
            }
        })
    }
        if (!permissions.has('SPEAK')) {
            return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: "OOPS..! I lack the **`SPEAK` Permission** on those Channels."
            }
        })
    }
 
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `*${playlist.title}* Has been added to the **Queue**!`
            }
        })
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                 let sembed = new Discord.RichEmbed()
                 .setAuthor("🎶 Search Results")
                 .setDescription(`${videos.map(video2 => `**${++index}** • ${video2.title}`).join('\n')}`)
                 .setFooter("• Please choose the Song by ranging 1 - 10.")
                 .setColor('#FF0000')
                    var selection = await msg.channel.send(sembed)
 
                    try {
                        var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
                            maxMatches: 1,
                            time: 15000,
                            errors: ['time']
                        });
                                                selection.delete();
                    } catch (err) {
                        console.error(err);
                        return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `Time's Up, Song Selection has been **CLOSED**.`
            }
        })
                        selection.delete();
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err)
                    return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `No results found with that Query.`
            }
        })
                }
            }
            return handleVideo(video, msg, voiceChannel);
        }
    } else if (command === 'skip') {
        if (!msg.member.voiceChannel) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `You're not in the **Voice Channel**, go Join some!`
            }
        })
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `Unable to **Skip**, because the **Queue** is empty.`
            }
        })
        serverQueue.connection.dispatcher.end('Skip Command has been used.');
        return msg.channel.send({embed: {
          color: randomhexcolor,
          description: `I **Skip** this Song for you.`,
        }});
    } else if (command === 'stop') {
       let member = msg.member;
        if (!msg.member.voiceChannel) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `You're not in the **Voice Channel**, go Join some!`,
            }
        })
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `Unable to **Stop**, because the **Queue** is empty.`
            }
        })
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end('Stop Commands has been Used.');
        return msg.channel.send({embed: {
          color: randomhexcolor,
          description: `This Song was **Skipped**, and all Song **Queue**s has been **Cleared**.`,
        }});
      } else if (command === 'volume') {
          if (!msg.member.voiceChannel) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `You're not in the **Voice Channel**, go Join some!`
            }
        });
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `Unable to set the **Volume**, because **Queue** is empty.`
            }
        })
        if (!args[1]) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `🔊 Current **Volume** Is: __*${serverQueue.volume}%*__`
            }
        });
        serverQueue.volume = args[1];
    if (args[1] > 100) return msg.channel.send({
      embed: {
        color: randomhexcolor,
        description: `I don't want to hurt yourself, so the **Volume** limit is: __*100%*__.`
      }
    });
     serverQueue.volume = args[1];
     if (args[1] > 100) return !serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 100) +
       msg.channel.send({
      embed: {
        color: randomhexcolor,
        description: `I don't want to hurt yourself, so the **Volume** limit is: __*100%*__.`
      }
    });
     if (args[1] < 101) return serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 100) +
          msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `🔊 I set the **Volume** to: __*${args[1]}%*__`
            }
        });
      } else if (command === 'np') {
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `The Song **Queue** is empty.`
            }
        })
        return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `▶ Now Playing: **${serverQueue.songs[0].title}**`
            }
        })
    } else if (command === 'queue') {
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `<:no:435160985259737099> | The Song **Queue** is empty.`
            }
        })
        return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `🎶 **Song Queue List**
 
${serverQueue.songs.map(song => `• ${song.title}`).join('\n')}`
            }
        })
    } else if (command === 'pause') {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `⏸ Music has been **Paused**.`
            }
        })
        }
        return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `You're not in the **Voice Channel**, go Join some!`
            }
        })
    } else if (command === 'resume') {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `⏯ Music has been **Resumed**.`
            }
        })
        }
        return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `The Song **Queue** is empty.`
            }
        })
    }
 
    return undefined;
});
 
async function handleVideo(video, msg, voiceChannel, playlist = false) {
    const serverQueue = queue.get(msg.guild.id);
    console.log(video);
  const song = {
        id: video.id,
        title: Discord.Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`,
        uploadedby: video.channel.title,
        channelurl: `https://www.youtube.com/channel/${video.channel.id}`,
        durationh: video.duration.hours,
        durationm: video.duration.minutes,
        durations: video.duration.seconds,
        request: msg.author,
        channels: voiceChannel.name,
    }
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 50,
            playing: true
        };
        queue.set(msg.guild.id, queueConstruct);
 
        queueConstruct.songs.push(song);
 
        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(msg.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`Error when Joining the Voice Channel because: ${error}.`);
            queue.delete(msg.guild.id);
            return msg.channel.send({
            embed: {
                color: randomhexcolor,
                description: `Error when Joining the **Voice Channel** because: *${error}*.`
            }
        });
        }
    } else {
      var index = 1;
      var queueembed = new Discord.RichEmbed()
      .setAuthor(`Added To Queue!`, `https://images-ext-1.discordapp.net/external/YwuJ9J-4k1AUUv7bj8OMqVQNz1XrJncu4j8q-o7Cw5M/http/icons.iconarchive.com/icons/dakirby309/simply-styled/256/YouTube-icon.png`)
      .setThumbnail(`https://i.ytimg.com/vi/${song.id}/default.jpg?width=80&height=60`)
      .setColor('#FF0000')
      .addField("Title", `**[${song.title}](${song.url})**`, true)
      .addField("Duration", `In \`${song.durationh}H : ${song.durationm}M : ${song.durations}S\``, true)
      .addField("Played By", `${song.request}`, true)
      .addField("Queue", `Position **${index++}**`, true)
      .setTimestamp()
      .setFooter(`• Messages For: ${msg.author.tag}`, msg.author.displayAvatarURL);
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        if (playlist) return undefined;
        else return msg.channel.send(queueembed);
    }
    return undefined;
}
 
function play(guild, song) {
    const serverQueue = queue.get(guild.id);
 
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
}
    console.log(serverQueue.songs);
 
    const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
        .on('end', reason => {
            if (reason === 'Stream is not generating quickly enough.') console.log('Ping of the Bot is too low, Song Ended.');
            else console.log(reason);
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 100);
 
  let startembed = new Discord.RichEmbed()
  .setAuthor(`| Start Playing`, `https://images-ext-1.discordapp.net/external/YwuJ9J-4k1AUUv7bj8OMqVQNz1XrJncu4j8q-o7Cw5M/http/icons.iconarchive.com/icons/dakirby309/simply-styled/256/YouTube-icon.png`)
  .setThumbnail(`https://i.ytimg.com/vi/${song.id}/default.jpg?width=80&height=60`)
  .setColor('#FF0000')
  .addField("Title", `**[${song.title}](${song.url})**`, true)
  .addField("Duration", `In \`${song.durationh}H : ${song.durationm}M : ${song.durations}S\``, true)
  .addField("Played By", `${song.request}`, true)
  .addField("Voice Room", `At: ${song.channels}`, true)
  .addField("Volume", `Current: ${serverQueue.volume}%`, true)
  .setTimestamp()
  .setFooter(`• If you didn't hear anything, just Reconnect from the Voice Channel.`);
 
    serverQueue.textChannel.send(startembed);
};
 
bot.login(process.env.BOT_TOKEN);
