package partycast

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
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/pilu/fresh/runner/runnerutils"
	_ "github.com/srinathgs/mysqlstore"
	_ "golang.org/x/net/context"

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

	contexts = NewContextMap()
)

// setup

func init() {
	// command line flags and config
	flag.StringVar(&configPath, "config", defaultConfigPath,
		"Location of the config file.")
	var err error
	config, err = LoadConfig(configPath)
	if err != nil {
		fmt.Printf("Fatal: Failed to load config. %s\n", err)
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

	// Session Store
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

	// Configure goth/gothic
	gothic.Store = store
	gothic.GetProviderName = func(req *http.Request) (string, error) {
		vars := mux.Vars(req)
		return vars["provider"], nil
	}
	loadProviders()
}

func loadProviders() {
	// Auth Provider Config and loading
	providers := make([]goth.Provider, 0)
	endpoint := fmt.Sprintf("%s://%s/auth/", "http", config.Host)
	if auth, ok := config.Auth["twitter"]; ok {
		providers = append(providers,
			twitter.NewAuthenticate(auth.Key, auth.Secret,
				endpoint+"twitter/callback"))
	}
	if auth, ok := config.Auth["facebook"]; ok {
		providers = append(providers,
			facebook.New(auth.Key, auth.Secret, endpoint+"/facebook/callback"))
	}
	if auth, ok := config.Auth["gplus"]; ok {
		providers = append(providers,
			gplus.New(auth.Key, auth.Secret, endpoint+"gplus/callback"))
	}
	goth.UseProviders(providers...)
}

// Middleware

// put things in the context
func contextualize(w http.ResponseWriter, req *http.Request,
	next http.HandlerFunc) {

	ctx := contexts.Get(req)
	contexts.Put(req, ctx)
	next(w, req)
}

func runnerErrors(w http.ResponseWriter, req *http.Request,
	next http.HandlerFunc) {

	if runnerutils.HasErrors() {
		runnerutils.RenderError(w)
	} else {
		next(w, req)
	}
}

// Routes

func buildAuthRoutes(auth *mux.Router) {
	auth.Path("/{provider}").
		Methods("GET").
		HandlerFunc(gothic.BeginAuthHandler)
	auth.Path("/{provider}/callback").
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

func buildAPIRoutes(api *mux.Router) {
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
	// global middleware
	app := negroni.Classic()
	if os.Getenv("DEV_RUNNER") == "1" {
		fmt.Println("INFO: running with reloader")
		app.UseFunc(runnerErrors)
	}
	// app.UseFunc(contextualize)

	// build routes
	r := mux.NewRouter().StrictSlash(true)
	// /api
	api := r.PathPrefix("/api").Subrouter()
	buildAPIRoutes(api)
	// /auth
	auth := r.PathPrefix("/auth").Subrouter()
	buildAuthRoutes(auth)
	// attach
	app.UseHandler(r)

	// listen
	addr := fmt.Sprintf("%s:%d", config.Hostname, config.Port)
	err := http.ListenAndServe(addr, app)
	if err != nil {
		fmt.Printf("Fatal: server died from error.\n%s\n", err)
	}
}
