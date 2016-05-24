package partycast

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
)

const (
	defaultConfigPath = "/etc/partycast.json"
)

type Config struct {
	Hostname     string `json:"hostname"`
	Port         uint   `json:"port"`
	Host         string `json:"-"`
	Database     string `json:"database"`
	CookieSecret string `json:"cookie-secret"`
	Auth         map[string]struct {
		Key    string `json:"key"`
		Secret string `json:"secret"`
	} `json:"auth"`
}

var loadConfig = func() (*Config, error) {
	var err error
	var configPath string
	// load config from file
	flag.StringVar(&configPath, "config", defaultConfigPath,
		"Location of the config file.")
	config := &Config{}
	configBytes, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(configBytes, config)
	// overwrite with relevant flags
	flag.StringVar(&config.Hostname, "hostname", config.Hostname,
		"Listen on the specified hostname.")
	if config.Hostname == "" {
		config.Hostname = "localhost"
	}
	flag.UintVar(&config.Port, "port", config.Port,
		"listen on the specified port")
	config.Host = fmt.Sprintf("%s:%d", config.Hostname, config.Port)
	flag.StringVar(&config.Host, "host", config.Host,
		"Listen on the specified host/port. Overwrites hostname and port options")
	return config, nil
}
