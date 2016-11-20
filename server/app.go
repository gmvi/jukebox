package jukebox

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	_ "github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

const (
	VERSION      = "0.0.1"
	SESSION_NAME = "session" // needs to change when session structs change
	LOG_OPTIONS  = log.Ldate | log.Ltime | log.Lshortfile
)

var (
	config *Config
	store  sessions.Store
	router *mux.Router
	Debug  *log.Logger
	Info   *log.Logger
	Warn   *log.Logger
	Error  *log.Logger
)

func init() {
	// initialize loggers
	Debug = log.New(os.Stdout, "DEBUG ", LOG_OPTIONS)
	Info = log.New(os.Stdout, "INFO ", LOG_OPTIONS)
	Warn = log.New(os.Stdout, "WARNING ", LOG_OPTIONS)
	Error = log.New(os.Stderr, "ERROR ", LOG_OPTIONS)
}

func loadRoutes(router *mux.Router) error {
	cwd, err := os.Getwd()
	if err != nil {
		return err
	}
	Debug.Printf("serving / from %s\n", path.Join(cwd, "./app/assets/index.html"))
	Debug.Printf("serving /assets/ from %s\n", path.Join(cwd, "./app/assets/"))
	// serve index
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./app/assets/index.html")
	})
	// serve assets
	router.PathPrefix("/assets/").Handler(http.StripPrefix("/assets/", http.FileServer(http.Dir("./app/assets/"))))
	// mount API
	apiRouter := router.PathPrefix("/api").Subrouter()
	loadAPIRoutes(apiRouter)
	// authRouter := router.PathPrefix("/auth").Subrouter()
	// loadAuthRoutes(authRouter)
	return nil
}

func Run() {
	var err error
	// config
	config, err = loadConfig()
	if err != nil {
		Error.Printf("failed to load config: %v", err)
		os.Exit(1)
	}
	// app framework setup
	router = mux.NewRouter().StrictSlash(true)
	// gorilla sessions setup
	store = sessions.NewCookieStore([]byte(config.CookieSecret))
	// // configure authentication providers
	// loadAuth()
	// load the routes
	err = loadRoutes(router)
	if err != nil {
		Error.Printf("failed to load routes: %v", err)
		os.Exit(1)
	}
	// connect to the database
	err = ConnectDatabase()
	if err != nil {
		Error.Printf("database connection failed: %v", err)
		os.Exit(1)
	}
	addr := fmt.Sprintf("%s:%d", config.Hostname, config.Port)
	Info.Printf("Listening on %s\n", addr)
	err = http.ListenAndServe(addr, router)
	if err != nil {
		Error.Printf("server died from error: %v", err)
	}
}
