Influx
======
A party playlist service which will support linking from streaming services (soundcloud, youtube; like plug.dj), and also support p2p streaming (like the non-p2p filesharing of the late & great turntable.fm). The idea is I want something like plug.dj, but for a  use-case more in-line with what I once used turntable.fm for: people in the same physical space, all contributing music from their own devices to a single playlist. All file-sharing has to be p2p though, I don't want any copyrighted material passing through servers I own.

### Current goals for minimum viable prototype
- users are either 'host' or 'client'
- single host-user for each room, this user has admin permissions
- host user has one 'main' javascript app instance (w/ option to switch), this plays the music
- each user has a 'main' javascript app instance, all others are view-only (w/ option to switch focus)
- each 'main' app instance has a local playlist, this is not persisted across refresh
- playlists can only contain local files
- rooms will only have 'round-robin' mode: each time a new song is needed, it will be requested from the next user
- login w/ google

### Planned features for after MVP (more of a idea-dump than a roadmap)
- better project name and a catchy domain name
- multiple logins: facebook, google, twitter, (email?)
- linking from youtube
- linking from soundcloud
- linking from spotify When host is a desktop w/ spotify set up? Can I hijack embedding?
- linking from bandcamp? Search will be difficult. Can I hijack embedding?
- 3rd-party storage integration for persisting local-file playlists? dropbox? google drive?
- Native phone apps
