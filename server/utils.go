package jukebox

import (
	"net/http"

	"github.com/gorilla/sessions"
)

func throw(err error) {
	if err != nil {
		panic(err)
	}
}

func redirectContinue(w http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	next := query.Get("continue")
	if next == "" {
		next = "/"
	}
	http.Redirect(w, req, next, http.StatusSeeOther)
}

func getProfile(session *sessions.Session) *Profile {
	val := session.Values["profile"]
	var profile *Profile
	var ok bool
	if profile, ok = val.(*Profile); ok {
		return profile
	} else {
		return nil
	}
}

func newProfile(session *sessions.Session) *Profile {
	profile := &Profile{
		Guest: true,
		Name:  "",
		Email: "",
	}
	profile.Save()
	return profile
}
