package jukebox

import (
	"encoding/json"
	"github.com/kelseyhightower/envconfig"
	flag "github.com/spf13/pflag"
	"io/ioutil"
)

const (
	configDefaultsFile = "./defaults.json"
)

type Config struct {
	Hostname     string `json:"hostname"`
	Port         uint   `json:"port"`
	Database     string `json:"database"`
	CookieSecret string `json:"cookie-secret"`
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
		conf.CookieSecret = defaults.CookieSecret
	}
}

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
	err = envconfig.Process("myapp", config)
	if err != nil {
		return nil, err
	}
	ApplyDefaults(config, defaults)
	// define flags
	flag.StringVar(&config.Hostname, "hostname", config.Hostname, "Listen on the specified hostname.")
	flag.UintVar(&config.Port, "port", config.Port, "listen on the specified port")
	flag.Parse()
	return config, nil
}
