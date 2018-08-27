const Discord = require("discord.js");
const bot = new Discord.Client({disableEveryone: true});
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const youtube = new YouTube(process.env.yt);
const queue = new Map();
const http = require('http');
const cooldown = new Set();
const express = require('express');
const app = express();
const send = require('quick.hook')
const path = require('path');
const client = new Discord.Client();
const db = require('quick.db')
const moment = require("moment");
require("moment-duration-format");


var prefix = 'ds!';


client.on("message", async message => {
    var args = message.content.substring(prefix.length).split(" ");
    if (!message.content.startsWith(prefix)) return;
    if (message.channel.type === 'dm') return;
  var searchString = args.slice(1).join(' ');
	var url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	var serverQueue = queue.get(message.guild.id);
    switch (args[0].toLowerCase()) {
      case "play":
      case "p":
    var voiceChannel = message.member.voiceChannel;
		if (!voiceChannel) return message.channel.send({embed: {
            0xa7f9da  : 0xa7f9da,
            description: `⛔ You need to be in a voice channel to play music!`
        }})
		var permissions = voiceChannel.permissionsFor(message.client.user);
		if (!permissions.has('CONNECT')) {
			return message.channel.send({embed: {
                0xa7f9da
        : 0xa7f9da,
                description: `⛔ I cannot connect to your voice channel, make sure I have the proper permissions`
            }})
		}
		if (!permissions.has('SPEAK')) {
			return message.channel.send({embed: {
                color: 0xa7f9da,
                description: `⛔ I cannot connect to your voice channel, make sure I have the proper permissions`
            }})
		}
      if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			var playlist = await youtube.getPlaylist(url);
			var videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				var video2 = await youtube.getVideoByID(video.id); 
				await handleVideo(video2, message, voiceChannel, true); 
			}
			return message.channel.send({embed: {
                color: 0xa7f9da,
                description: `✅ Playlist: **${playlist.title}** has been added to the queue!`
            }})
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 10);
					var index = 0;
message.channel.send({embed: {
color: 0xa7f9da,
description: `**:notes:  Song List:**
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}`
}})
					// eslint-disable-next-line max-depth
					try {
						var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return message.channel.send({embed: {
                            color: 0xa7f9da,
                            description: `❎ Cancelling song selection.`
                        }})
					}
					var videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return message.channel.send({embed: {
                        color: 0xa7f9da,
                        description: `⛔ I don't think so. . .`
                    }})
				}
			}
			return handleVideo(video, message, voiceChannel);
		}
        break;
      case "skip":
      case "s":
      if (message.channel.type === 'dm') return;
      if (!message.member.hasPermission('ADMINISTRATOR')) { 
        message.channel.send (`Sorry ${message.author}, You Need ADMINISTRATOR Permissions for use this commands!`); 
        return; 
    }
		if (!message.member.voiceChannel) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ You are not in voice channel!`
        }})
		if (!serverQueue) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ Nothing playing that I could skip for you.`
        }})
		serverQueue.connection.dispatcher.end({embed: {
            color: 0xa7f9da,
            description: `⛔ Skip command has been used.`
        }})
		return undefined;
        break;
      case "stop":
      if (message.channel.type === 'dm') return;
      if (!message.member.hasPermission('ADMINISTRATOR')) { 
        message.channel.send (`Sorry ${message.author}, You Need ADMINISTRATOR Permissions for use this commands!`); 
        return; 
    }
		if (!message.member.voiceChannel) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ You are not in a voice channel!`
        }})
		if (!serverQueue) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ There is nothing playing.`
        }})
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end({embed: {
            color: 0xa7f9da,
            description: `⏹️ Music has been Stopped.`
        }})
		return undefined;
break;
      case "volume":
      if (message.channel.type === 'dm') return;
      if (!message.member.hasPermission('ADMINISTRATOR')) { 
        message.channel.send (`Sorry ${message.author}, You Need ADMINISTRATOR Permissions for use this commands!`); 
        return; 
    }
		if (!message.member.voiceChannel) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ You are not in a voice channel!`
        }})
		if (!serverQueue) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ There is nothing playing.`
        }})
		if (!args[1]) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `🔊 The current volume is: **${serverQueue.volume}**`
        }})
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `🔊 I set the volume to: **${args[1]}**`
        }})
break;
      case "np":
      case "nowplaying":
      if (message.channel.type === 'dm') return;
		if (!serverQueue) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ There is nothing playing.`
        }})
		return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `🎶 Now playing: **${serverQueue.songs[0].title}**`
        }})
break;
      case "queue":
      case "q":
      if (message.channel.type === 'dm') return;
		if (!serverQueue) return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ There is nothing playing.`
        }})
		return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `__**🎵Song queue:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**🎶Now playing:** ${serverQueue.songs[0].title}`
        }})
break;
      case "pause":
      if (message.channel.type === 'dm') return;
      if (!message.member.hasPermission('ADMINISTRATOR')) { 
        message.channel.send (`Sorry ${message.author}, You Need ADMINISTRATOR Permissions for use this commands!`); 
        return; 
    }
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return message.channel.send({embed: {
                color: 0xa7f9da,
                description: `⏸ Music has been Paused.`
            }})
		}
		return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ There is nothing playing.`
        }})
break;
      case "resume":
      if (message.channel.type === 'dm') return;
      if (!message.member.hasPermission('ADMINISTRATOR')) { 
        message.channel.send (`Sorry ${message.author}, You Need ADMINISTRATOR Permissions for use this commands!`); 
        return; 
    }
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return message.channel.send({embed: {
                color: 0xa7f9da,
                description: `▶️ Music has been Resume.`
            }})
		}
		return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `⛔ There is nothing playing.`
        }})
	

	return undefined;
break;
}
async function handleVideo(video, message, voiceChannel, playlist = false) {
	var serverQueue = queue.get(message.guild.id);
	console.log(video);
	var song = {
		id: video.id,
		title: Discord.Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`,
		durationh: video.duration.hours,
		durationm: video.duration.minutes,
		durations: video.duration.seconds,
	};
	if (!serverQueue) {
		var queueConstruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(message.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(message.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error({embed: {
                color: 0xa7f9da,
                description: `⛔ I could not join the voice channel: ${error}`
            }})
			queue.delete(message.guild.id);
            return message.channel.send({embed: {
                color: 0xa7f9da,
                description: `⛔ I could not join the voice channel: ${error}`
            }})
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return message.channel.send({embed: {
            color: 0xa7f9da,
            description: `✅ **${song.title}** has been added to the queue!`
        }})
	}
	return undefined;
}
  
  function play(guild, song) {
	var serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
      message.channel.send(' ');
			if (reason === 'Stream is not generating quickly enough.') console.log('Song end');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

   let serverembed = new Discord.RichEmbed()
    .setColor("0xa7f9da")
    .setAuthor(`${client.user.username} | Playing`,``)
    .setURL('https://cdn.discordapp.com/avatars/481498983810990081/74fa8dc339441798ed5656c010b25a1d.png?size=2048')
    .setThumbnail(`https://i.ytimg.com/vi/${song.id}/default.jpg?width=80&height=60`)
    .addField('Title', `[${song.title}](${song.url})`, false)
    .addField('Song ID', `${song.id}`, true)
    .addField("Requested By", `${message.author}`, true)
    .addField("Duration", `${song.durationh}H ${song.durationm}M ${song.durations}S`, true)
    .addField  ("Volume", `${serverQueue.volume}`, true)
    .setTimestamp()
    .setFooter(`©Dekomori Sanae`)

   serverQueue.textChannel.send(serverembed);
}
});





client.login(process.env.token);
