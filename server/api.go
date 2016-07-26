package jukebox

import (
	"encoding/json"
	_ "fmt"
	"net/http"

	"github.com/gorilla/mux"
)

func loadAPIRoutes(r *mux.Router) {
	// /api/version
	r.Path("/version").
		Methods("GET").
		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			data, err := json.Marshal(map[string]interface{}{
				"version": version,
			})
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
			} else {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				w.Write(data)
			}
		})
	// /api/profile
	//	r.Path("/profile").
	//		Methods("GET", "POST", "DELETE").
	//		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
	//			session, err := store.Get(req, SESSION_NAME)
	//			throw(err)
	//			profile := getProfile(session)
	//			if profile == nil {
	//				profile = newProfile(session)
	//			}
	//			w.Header().Set("Content-Type", "application/json")
	//			switch req.Method {
	//			case "GET":
	//				// do nothing
	//			case "POST":
	//				req.ParseForm()
	//				if name, ok := req.PostForm["name"]; ok {
	//					profile.Name = name[0]
	//				}
	//				if email, ok := req.PostForm["email"]; ok {
	//					profile.Email = email[0]
	//				}
	//				session.Values["profile"] = profile
	//				session.Save(req, w)
	//				profile.Save() // save to database
	//			case "DELETE":
	//				session.Values["profile"] =
	//					profile.Remove()
	//			}
	//			json.NewEncoder(w).Encode(profile)
	//		})
}
