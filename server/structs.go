package partycast

import (
	_ "encoding/gob"
	"time"
)

func init() {
	// gob.Register(&User{})
}

type Auth struct {
	ID        int     `json:"uid"`
	Guest     bool    `json:"guest"`
	ProfileID int     `json:"pid"`
	Profile   Profile `json:-`
}

type Profile struct {
	ID    int    `json:"pid"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type ProviderAuth struct {
	Provider          string
	UserID            string
	AccessToken       string
	AccessTokenSecret string
	RefreshToken      string
	ExpiresAt         time.Time
}

type Role struct {
	ID        int    `json:"-"`
	RoomID    int    `json:"-"`
	ProfileID int    `json:"pid"`
	Type      string `json:"role"`
}

type Room struct {
	ID     int    `json:"rid"`
	Name   string `json:"name"`
	Admins []Role `json:"admins"`
}
