Jukebox
======
A party playlist app. Sort of like turntable.fm or plug.dj (RIP), but meant for
physical spaces. Built on peer-to-peer communication via WebRTC. I hope to
support a variety of services, such as SoundCloud, YouTube, Bandcamp, and
Spotify. Streaming local files to the hosting browser-session is one of the
primary goals of the project, but is not currently in development. 

### Current plan for MVP
- simple single-host permissions system, i.e. no moderators
- simple server architecture consisting of a host registry, webRTC
  signalmaster, and search api
- users can have multiple tabs/windows open seamlessly
- soundcloud and youtube sources
- rooms will only have 'round-robin' mode: users take turns providing tracks for the playlist

### Feature ideas
- users can load files from the local filesystem and stream them to host
- option to turn varisous sources on/off. This blocks implementation of the
  spotify service, which can only be turned on on a desktop.
- persistant personal playlists like plug.dj
- Native phone apps
