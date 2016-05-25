package partycast

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/facebook"
	"github.com/markbates/goth/providers/gplus"
	"github.com/markbates/goth/providers/twitter"
)

// Go doesn't have function polymorphism so we wrap Provider constructors.
type providerFunc func(string, string, string) goth.Provider

var providerFuncs = map[string]providerFunc{
	"twitter": func(key, secret, callback string) goth.Provider {
		return twitter.NewAuthenticate(key, secret, callback)
	},
	"facebook": func(key, secret, callback string) goth.Provider {
		return facebook.New(key, secret, callback)
	},
	"gplus": func(key, secret, callback string) goth.Provider {
		return gplus.New(key, secret, callback)
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
				panic(err)
			}
			session, err := store.Get(req, "session")
			if err != nil {
				panic(err)
			}
			val := session.Values["profile"]
			var profile *Profile
			var ok bool
			if profile, ok = val.(*Profile); !ok {
				profile, err = lookupProfile(user.Email)
				if err != nil {
					panic(err)
				}
				if profile == nil {
					profile = &Profile{}
					profile.Name = user.Name
					profile.Email = user.Email
					err = insertProfile(profile)
					if err != nil {
						panic(err)
					}
				}
				// if we didn't get profile from session, save it
				session.Values["profile"] = profile
				session.Save(req, w)
			}
			auth := &Auth{
				Provider:    user.Provider,
				ProviderUID: user.UserID,
				ProfileID:   profile.ID,
			}
			err = insertAuth(auth)
			if err != nil {
				panic(err)
			}
		})
}
