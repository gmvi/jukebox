package server

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/codegangsta/negroni"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/gorilla/context"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	_ "github.com/srinathgs/mysqlstore"

	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/facebook"
	"github.com/markbates/goth/providers/gplus"
	"github.com/markbates/goth/providers/twitter"
)

const (
	version           = "0.0.1"
	defaultConfigPath = "/etc/partycast.json"
)

var (
	configPath string
	config     *Config
	store      sessions.Store
	db         *sql.DB
)

func init() {
	// command line flags and config
	flag.StringVar(&configPath, "config", defaultConfigPath,
		"Location of the config file.")
	var err error
	config, err = LoadConfig(configPath)
	if err != nil {
		fmt.Printf("%s\n", err)
		os.Exit(1)
	}
	hostname := flag.String("host", "", "listen on the specified hostname")
	if *hostname != "" {
		config.Hostname = *hostname
	}
	if config.Hostname == "" {
		config.Hostname = "localhost"
	}
	port := flag.Uint("port", 0, "listen on the specified port")
	if *port != 0 {
		config.Port = uint16(*port)
	}
	config.Host = fmt.Sprintf("%s:%d", config.Hostname, config.Port)

	// Sessions
	store = sessions.NewCookieStore([]byte(config.CookieSecret))

	// Database
	db, err = sql.Open("mysql", config.Database)
	if err != nil {
		fmt.Printf("Fatal: database connection failed\n%s\n", err)
		os.Exit(1)
	}
	err = db.Ping() // fail early
	if err != nil {
		fmt.Printf("Fatal: initial ping failed\n%s\n", err)
		os.Exit(1)
	}

	// Auth Providers
	providers := make([]goth.Provider, 0)
	cb := fmt.Sprintf("%s://%s/auth/callback?provider=", "http", config.Host)
	if auth, ok := config.Auth["twitter"]; ok {
		providers = append(providers,
			twitter.New(auth.Key, auth.Secret, cb+"twitter"))
	}
	if auth, ok := config.Auth["facebook"]; ok {
		providers = append(providers,
			facebook.New(auth.Key, auth.Secret, cb+"facebook"))
	}
	if auth, ok := config.Auth["gplus"]; ok {
		providers = append(providers,
			gplus.New(auth.Key, auth.Secret, cb+"gplus"))
	}
	goth.UseProviders(providers...)
}

func buildAuth(auth *mux.Router) {
	auth.Path("/").
		Methods("GET").
		HandlerFunc(gothic.BeginAuthHandler)
	auth.Path("/callback").
		Methods("GET").
		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			user, err := gothic.CompleteUserAuth(w, req)
			if err != nil {
				fmt.Fprintln(w, err)
				return
			}
			fmt.Fprintln(w, user)
		})
}

func buildAPI(api *mux.Router) {
	// /api/version
	api.Path("/version").
		Methods("GET").
		HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			w.WriteHeader(http.StatusOK)
			fmt.Fprintln(w, version)
		})
	// /api/auth
	api.Path("/auth").
		Methods("GET", "POST").
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
			switch req.Method {
			case "GET":
				data, _ := json.Marshal(map[string]int{"uid": uid})
				w.Write(data)
			case "POST":
				uidval := req.FormValue("uid")
				uid, err := strconv.Atoi(uidval)
				if err != nil {
					w.WriteHeader(http.StatusBadRequest)
					return
				}
				session.Values["user"] = uid
				session.Save(req, w)
				// save before writing to the body
			}
		})
	// /api/profile
	api.Path("/profile").
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

func Run() {
	// attach routes
	r := mux.NewRouter().StrictSlash(true)
	// /api
	api := r.PathPrefix("/api").Subrouter()
	buildAPI(api)
	auth := r.PathPrefix("/auth").Subrouter()
	buildAuth(auth)

	// mix in global middleware
	app := negroni.Classic()
	app.UseHandler(r)

	// listen
	addr := fmt.Sprintf("%s:%d", config.Hostname, config.Port)
	err := http.ListenAndServe(addr, app)
	if err != nil {
		fmt.Printf("Fatal: server died from error.\n%s\n", err)
	}
}
