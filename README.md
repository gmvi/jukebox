Peertable
======
A party playlist service. Like turntable.fm (RIP), but peer-to-peer and meant
for physical spaces, with all music files flowing to one host computer connected
to speakers. Peertable will support linking from streaming services including
soundcloud and youtube, like plug.dj (also RIP).

### Current plan for MVP
- users are either 'host' or 'client'
- single host-user for each room, this user acts as the server of a traditional app
  architecture. The server is a storefront pointing users to the host.
- host user may open multiple pages open, need to make sure only one is host, others become clients
- each client user can load files, but these are not persisted across refresh
- host has a buffer of upcoming songs in localstorage?
- playlists can only contain local files
- rooms will only have 'round-robin' mode: each time a new song is needed, it will be requested from the next user in the queue

#### Feature ideas
- better project name and a catchy domain name?
- linking from youtube and soundcloud
- option to allow spotify linking when host is a desktop w/ spotify set up
- linking from bandcamp? Search will be difficult. Can I hijack embedding? Is scraping from bandcamp ethical?
- personal playlists like plug.dj
- 3rd-party storage integration for persisting playlists with local files? dropbox? google drive? amazon cloud drive?
- Native phone apps
