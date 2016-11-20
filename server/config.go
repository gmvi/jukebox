package jukebox

import (
	"encoding/json"
	"io/ioutil"

	"github.com/kelseyhightower/envconfig"
	flag "github.com/spf13/pflag"
)

const (
	configDefaultsFile = "./defaults.json"
)

type Config struct {
	Hostname     string `json:"hostname"`
	Port         uint   `json:"port" envconfig:"port"`
	Database     string `json:"database"`
	CookieSecret string `json:"cookie-secret"`
	LogDebug     bool   `json:"-" ignored:"true"`
}

func ApplyDefaults(conf, defaults *Config) {
	if conf.Hostname == "" {
		conf.Hostname = defaults.Hostname
	}
	if conf.Port == 0 {
		conf.Port = defaults.Port
	}
	if conf.Database == "" {
		conf.Database = defaults.Database
	}
	if conf.CookieSecret == "" {
		Info.Println("Using default cookie secret")
		conf.CookieSecret = defaults.CookieSecret
	}
}

// load the config from env variables resorting to defaults when needed
var loadConfig = func() (*Config, error) {
	var err error
	configBytes, err := ioutil.ReadFile(configDefaultsFile)
	if err != nil {
		return nil, err
	}
	defaults := &Config{}
	err = json.Unmarshal(configBytes, defaults)
	if err != nil {
		return nil, err
	}
	config := &Config{}
	err = envconfig.Process("jukebox", config)
	if err != nil {
		return nil, err
	}
	ApplyDefaults(config, defaults)
	// define flags
	flag.StringVar(&config.Hostname, "hostname", config.Hostname, "Listen on the specified hostname")
	flag.UintVar(&config.Port, "port", config.Port, "listen on the specified port")
	flag.BoolVar(&config.LogDebug, "verbose", config.LogDebug, "print debug messages")
	flag.Parse()
	return config, nil
}
