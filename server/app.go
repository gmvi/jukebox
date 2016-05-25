package partycast

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/codegangsta/negroni"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	_ "github.com/srinathgs/mysqlstore"
)

const (
	version = "0.0.1"
)

var (
	config *Config
	app    *negroni.Negroni
	store  sessions.Store
	router *mux.Router
)

func initialize() {
	var err error
	config, err = loadConfig()
	if err != nil {
		fmt.Printf("Fatal: failed to load Config\n%s\n", err)
		os.Exit(1)
	}

	// app setup
	app = negroni.Classic()
	router = mux.NewRouter().StrictSlash(true)
	app.UseHandler(router)

	loadMiddleware()

	// Session Store
	store = sessions.NewCookieStore([]byte(config.CookieSecret))

	// Configure authentication providers
	loadAuth()

	api := router.PathPrefix("/api").Subrouter()
	loadAPI(api)

	router.Path("/").
		Methods("GET").
		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			session, err := store.Get(req, "session")
			if err != nil {
				panic(err)
			}
			val := session.Values["profile"]
			profile := &Profile{}
			var ok bool
			var data []byte
			if profile, ok = val.(*Profile); ok {
				data, err = json.Marshal(profile)
				if err != nil {
					panic(err)
				}
			} else {
				data = []byte("{}")
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write(data)
		})

	// Database
	err = ConnectDatabase()
	if err != nil {
		fmt.Printf("Fatal: database connection failed\n%s\n", err)
		os.Exit(1)
	}
}

func loadMiddleware() {
	// put things in context
	// app.UseFunc(func(w http.ResponseWriter, req *http.Request,
	// 	next http.HandlerFunc) {

	// 	ctx := contexts.Get(req)
	// 	contexts.Put(req, ctx)
	// 	next(w, req)
	// })
}

func Run() {
	initialize()
	addr := fmt.Sprintf("%s:%d", config.Hostname, config.Port)
	err := http.ListenAndServe(addr, app)
	if err != nil {
		fmt.Printf("Fatal: server died from error.\n%s\n", err)
	}
}
