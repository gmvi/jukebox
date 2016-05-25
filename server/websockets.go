package partycast

import (
	"fmt"

	"golang.org/x/net/websocket"
)

var (
	socketmap map[int]node
)

type node struct {
	id          int
	main        *websocket.Conn
	secondaries []*websocket.Conn
}

func signalServer(ws *websocket.Conn) {
	req := ws.Request()
	session, err := store.Get(req, "session")
	if err != nil {
		ws.Close()
		fmt.Printf("Error: error retrieving session data: %s\n", err)
		return
	}
	uid, _ := session.Values["uid"].(int)
	fmt.Fprintln(ws, uid)
	ws.Close()
}
