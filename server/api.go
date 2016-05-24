package partycast

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

func loadAPI(r *mux.Router) {
	// /api/version
	r.Path("/version").
		Methods("GET").
		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			w.WriteHeader(http.StatusOK)
			fmt.Fprintln(w, version)
		})
	// /api/auth
	r.Path("/auth").
		Methods("GET").
		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			session, err := store.Get(req, "")
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			err = req.ParseForm()
			if err != nil {
				// what do?
			}
			uid, _ := session.Values["user"].(int)
			// switch req.Method {
			// case "GET":
			data, _ := json.Marshal(map[string]int{"uid": uid})
			w.Write(data)
			// }
		})
	// /api/profile
	r.Path("/profile").
		Methods("GET", "PATCH").
		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			switch req.Method {
			case "GET":
				fmt.Fprintf(w, "")
			case "PATCH":
				fmt.Fprintf(w, "")
			}
		})
}
