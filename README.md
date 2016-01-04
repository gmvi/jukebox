Peertable
======
A party playlist service. Like turntable.fm (RIP), but peer-to-peer and meant
for physical spaces, with all music files flowing to one host computer connected
to speakers. Peertable will support linking from streaming services including
soundcloud and youtube, like plug.dj (also RIP).

### Current plan for MVP
- users are either 'host' or 'client'
- single host-user for each room, this user acts like the server of a traditional app
  architecture. The actual server is a storefront pointing users to the host.
- host user may have multiple browser windows open, with at most one instance acting as the host node at a time.
- client users can load files, but these are not persisted anywhere, and are lost on refresh
- rooms will only have 'round-robin' mode: users take turns providing tracks for the playlist

#### Feature ideas
- better project name and a catchy domain name?
- option to allow spotify linking when host is a desktop w/ spotify set up
- linking from bandcamp? Search will be difficult. Can I hijack embedding? Is scraping from bandcamp ethical?
- persistant personal playlists like plug.dj
- Native phone apps
