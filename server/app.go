package partycast

import (
	"fmt"
	"net/http"
	"os"
	_ "strconv"

	"github.com/codegangsta/negroni"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	_ "github.com/pilu/fresh/runner/runnerutils"
	_ "github.com/srinathgs/mysqlstore"

	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/facebook"
	"github.com/markbates/goth/providers/gplus"
	"github.com/markbates/goth/providers/twitter"
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

	// if os.Getenv("DEV_RUNNER") == "1" {
	// 	fmt.Println("INFO: running with reloader")
	// 	app.UseFunc(func(w http.ResponseWriter, req *http.Request,
	// 		next http.HandlerFunc) {
	// 		if runnerutils.HasErrors() {
	// 			runnerutils.RenderError(w)
	// 		} else {
	// 			next(w, req)
	// 		}
	// 	})
	// }
}

type providerFunc func(string, string, string) goth.Provider

var providerFuncs = map[string]providerFunc{
	"twitter": func(k, s, c string) goth.Provider {
		return twitter.NewAuthenticate(k, s, c)
	},
	"facebook": func(k, s, c string) goth.Provider {
		return facebook.New(k, s, c)
	},
	"gplus": func(k, s, c string) goth.Provider {
		return gplus.New(k, s, c)
	},
}

func loadAuth() {
	// auth provider config
	providers := make([]goth.Provider, 0)
	cbFmt := fmt.Sprintf("%s://%s/auth/%%s/callback", "http", config.Host)
	for provider, New := range providerFuncs {
		if auth, ok := config.Auth[provider]; ok {
			cb := fmt.Sprintf(cbFmt, provider)
			providers = append(providers, New(auth.Key, auth.Secret, cb))
		}
	}
	goth.UseProviders(providers...)

	// settings
	gothic.Store = store
	gothic.GetProviderName = func(req *http.Request) (string, error) {
		vars := mux.Vars(req)
		return vars["provider"], nil
	}

	// auth routes
	auth := router.PathPrefix("/auth").Subrouter()
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

func Run() {
	initialize()
	addr := fmt.Sprintf("%s:%d", config.Hostname, config.Port)
	err := http.ListenAndServe(addr, app)
	if err != nil {
		fmt.Printf("Fatal: server died from error.\n%s\n", err)
	}
}
