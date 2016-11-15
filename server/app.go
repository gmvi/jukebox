package jukebox

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/facebookgo/devrestarter"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	_ "github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

const (
	version      = "0.0.1"
	SESSION_NAME = "session" // needs to change when session structs change

)

var (
	config *Config
	store  sessions.Store
	router *mux.Router
)

func init() {
	devrestarter.Init()
}

func loadRoutes(router *mux.Router) {
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./app/assets/index.html")
	})
	router.Handle("/assets/", http.FileServer(http.Dir("./app/assets/")))
	apiRouter := router.PathPrefix("/api").Subrouter()
	loadAPIRoutes(apiRouter)
	// authRouter := router.PathPrefix("/auth").Subrouter()
	// loadAuthRoutes(authRouter)

	router.Path("/").
		Methods("GET").
		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			session, err := store.Get(req, SESSION_NAME)
			throw(err)
			profile := getProfile(session)
			var data []byte
			if profile != nil {
				data, err = json.Marshal(profile)
				throw(err)
			} else {
				data = []byte("{}")
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write(data)
		})
}

func Run() {
	var err error
	// config
	config, err = loadConfig()
	if err != nil {
		fmt.Printf("Fatal: failed to load config\n%s\n", err)
		os.Exit(1)
	}
	// app framework setup
	router = mux.NewRouter().StrictSlash(true)
	// gorilla sessions setup
	store = sessions.NewCookieStore([]byte(config.CookieSecret))
	// // configure authentication providers
	// loadAuth()
	// load the routes
	loadRoutes(router)
	// connect to the database
	err = ConnectDatabase()
	if err != nil {
		fmt.Printf("Fatal: database connection failed\n%s\n", err)
		os.Exit(1)
	}
	addr := fmt.Sprintf("%s:%d", config.Hostname, config.Port)
	fmt.Printf("Listening on %s\n", addr)
	err = http.ListenAndServe(addr, router)
	if err != nil {
		fmt.Printf("Fatal: server died from error.\n%s\n", err)
	}
}
