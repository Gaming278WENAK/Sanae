const Discord = require("discord.js");
const superagent = require("superagent");
const YouTube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
const opus = require("opusscript");
 
var commandcooldown = new Set();
var queue = new Map();
 
var bot = new Discord.Client({
    disableEveryone: false
})
var youtube = new YouTube(process.env.yt);

bot.on("ready", async () => {
    console.log(`${bot.user.tag} Berhasil dinyalakan`)
})
 
bot.on('message', async msg => { // eslint-disable-line
    var message = msg;
 
    if (message.author.bot) return;
    if (message.channel.type === 'dm') return;
 
    var PREFIX = '>>'
 
    if (commandcooldown.has(message.author.id)) {
        return;
    }
    commandcooldown.add(message.author.id);
    setTimeout(() => {
        commandcooldown.delete(message.author.id);
    }, 3000);
 
    if (msg.author.bot) return undefined;
    if (!msg.content.startsWith(PREFIX)) return undefined;
 

  var serverQueue = queue.get(message.guild.id);
 
  var args = message.content.substring(PREFIX.length).split(" ")
 
  var url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
 
    let command = msg.content.toLowerCase().split(' ')[0];
    command = command.slice(PREFIX.length)
 
    if (command === 'play' || command === 'p') {
        var searchString = args.slice(1).join(" ");
        if(!searchString) return msg.channel.send({embed: {
          color: 0xa7f9da,
          description: `❌ Correct Usage Is: **~play or ~p [Song Name]/[Video URL]/[Playlist URL]**`
        }})
        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `You're Not In The **Voice Channel**, Go Join Some!`
            }
        })
        const permissions = voiceChannel.permissionsFor(bot.user);
        if (!permissions.has('CONNECT')) {
              msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: "OOPS..! I Lack The `Connect` Permissions On Those Channel!"
            }
        })
    }
        if (!permissions.has('SPEAK')) {
            return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: "OOPS..! I Lack The `Speak` Permissions On Those Channel!"
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
                color: 0xa7f9da,
                description: `⏺ *${playlist.title}* Has Been Added To **Queue** !`
            }
        })
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    var selection = await msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `**🎶 | Search Results | Select from 1 - 10**\n
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}`
            }
        })
 
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
                color: 0xa7f9da,
                description: 'No or invalid value entered, cancelling video selection.'
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
                color: 0xa7f9da,
                description: `No Results Found With That Query!`
            }
        })
                }
            }
            return handleVideo(video, msg, voiceChannel);
        }
    } else if (command === 'skip' || command === 's') {
        if (!msg.member.voiceChannel) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `You're Not In The **Voice Channel**, Go Join Some!`
            }
        })
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `Unable To **Skip**, The Song Queue Is Empty.`
            }
        })
        serverQueue.connection.dispatcher.end('Skip Command Has Been Used!');
        return msg.channel.send({embed: {
          color: 0xa7f9da,
          description: `⏭ Current Playing Song Has Been **Skipped**.`,
        }});
    } else if (command === 'stop') {
       let member = msg.member;
        if (!msg.member.voiceChannel) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `You're Not In The **Voice Channel**, Go Join Some!`,
            }
        })
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `Unable To **Stop**, The Song Queue Is Empty.`
            }
        })
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end('Stop Commands Has Been Used!');
        return msg.channel.send({embed: {
          color: 0xa7f9da,
          description: `⏹ Current Playing Song Has Been **Stopped**, All Song Queues Has Been **Cleared**!.`,
        }});
      } else if (command === 'volume') {
          if (!msg.member.voiceChannel) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `You're Not In The **Voice Channel**, Go Join Some!`
            }
        });
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `Unable To Set The **Volume**, The Song Queue Is Empty.`
            }
        })
        if (!args[1]) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `Current Server **Volume** Is: _*${serverQueue.volume}%*_`
            }
        });
        serverQueue.volume = args[1];
    if (args[1] > 100) return msg.channel.send({
      embed: {
        color: 0xa7f9da,
        description: `I Don't Want To Hurt Yourself, So The **Volume** Limit Is: _*100%*_!`
      }
    });
     serverQueue.volume = args[1];
     if (args[1] > 100) return !serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 100) +
       msg.channel.send({
      embed: {
        color: 0xa7f9da,
        description: `I Don't Want To Hurt Yourself, So The **Volume** Limit Is: _*100%*_!`
      }
    });
     if (args[1] < 101) return serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 100) +
          msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `I Set The Server **Volume** To: _*${args[1]}%*_`
            }
        });
      } else if (command === 'np') {
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `Song Queue Is Empty.`
            }
        })
        return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `🔃 Now Playing: **${serverQueue.songs[0].title}**`
            }
        })
    } else if (command === 'queue' || command === 'q') {
        if (!serverQueue) return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `Song Queue Is Empty.`
            }
        })
        return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `🎶 | **Song Queue**
 
${serverQueue.songs.map(song => `**•** ${song.title}`).join('\n')}`
            }
        });
    } else if (command === 'pause') {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `⏸ Music Has Been **Paused**.`
            }
        })
        }
        return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `You're Not In The **Voice Channel**, Go Join Some.`
            }
        })
    } else if (command === 'resume') {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `⏯ Music Has Been **Resumed**.`
            }
        })
        }
        return msg.channel.send({
            embed: {
                color: 0xa7f9da,
                description: `Song Queue Is Empty.`
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
            volume: 100,
            playing: true
        };
        queue.set(msg.guild.id, queueConstruct);
 
        queueConstruct.songs.push(song);
 
        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(msg.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`Error When Joining The **Voice Channel** Because: *${error}*`);
            queue.delete(msg.guild.id);
            return msg.channel.send({
            embed: {
                color: Math.floor(Math.random() * 16777214) + 1,
                description: `Error When Joining The **Voice Channel** Because: *${error}*.`
            }
        });
        }
    } else {
      var index = 1;
      var queueembed = new Discord.RichEmbed()
      .setColor("# a7f9da")
      .setAuthor(`Added To Queue!`, `https://images-ext-1.discordapp.net/external/YwuJ9J-4k1AUUv7bj8OMqVQNz1XrJncu4j8q-o7Cw5M/http/icons.iconarchive.com/icons/dakirby309/simply-styled/256/YouTube-icon.png`)
    
      .addField("Title", `[${song.title}](${song.url})`, true)
      .addField("Video Uploader", `[${song.uploadedby}](${song.channelurl})`, true)
      .addField("Duration", `${song.durationm}min ${song.durations}sec`, true)
      .addField("Video ID", `${song.id}`, true)
      .addField("Requested By", `${song.request}`, true)
      .addField("Queue", `Number ${index++}`, true)
  
      .setTimestamp()
      .setThumbnail(`https://i.ytimg.com/vi/${song.id}/default.jpg?width=80&height=60`);
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
            if (reason === '📶 | Ping Of The Bot Is Too Low,') console.log('Song Ended.');
            else console.log(reason);
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 100);
    dispatcher.setBitrate(96);
 
  let startembed = new Discord.RichEmbed()
  .setColor("#a7f9da")
  .setAuthor(`Start Playing`, `https://images-ext-1.discordapp.net/external/YwuJ9J-4k1AUUv7bj8OMqVQNz1XrJncu4j8q-o7Cw5M/http/icons.iconarchive.com/icons/dakirby309/simply-styled/256/YouTube-icon.png`)

  .addField("Title", `[${song.title}](${song.url})`)
  .addField("Video Uploader", `[${song.uploadedby}](${song.channelurl})`, true)
  .addField("Duration", `${song.durationm} Minute ${song.durations} Second`, true)
  .addField("Video ID", `${song.id}`, true)
  .addField("Requested By", `${song.request}`, true)
  .addField("Voice Room", `At: ${song.channels}`, true)
  .addField("Volume", `Current: ${serverQueue.volume}%`, true)

  .setTimestamp()
  .setThumbnail(`https://i.ytimg.com/vi/${song.id}/default.jpg?width=80&height=60`)
  .setFooter("If you can't hear the music, please reconect. If you still don't hear it, maybe the bot is restarting!");
 
    serverQueue.textChannel.send(startembed);
};

// Finally, we want to login to Discord with the bot
bot.login(process.env.token);
