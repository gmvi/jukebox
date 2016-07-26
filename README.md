Jukebox
=======
A party playlist app. Sort of like turntable.fm or plug.dj (RIP), but meant for
physical spaces. Built on peer-to-peer communication via WebRTC. I hope to
support a variety of services, such as SoundCloud, YouTube, Bandcamp, and
maybe even Spotify if I can hack it together. Streaming local files to the
hosting browser-session was one of the initial goals of the project, but is not
on the MVP list. 

### Current plan for MVP
- simple single-host permissions system, i.e. no moderators
- simple server architecture consisting of a host/room registry, webRTC
  signalmaster, and search
- soundcloud and youtube sources
- rooms will only have 'round-robin' mode: users take turns providing tracks for
  the playlist
- users can have multiple tabs/windows open seamlessly (this may have to wait
  until more work is done on auth)

### Feature ideas
- users can load files from the local filesystem and stream them to host
- option to turn various sources on/off. This blocks implementation of spotify
  as a source, which can only work on a desktop, until spotify provides a
  programmatically interactive iframe widget.
- persistant personal playlists like plug.dj
- Native phone apps
