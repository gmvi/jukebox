package jukebox

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
)

const (
	defaultConfigPath = "/etc/jukebox.json"
)

type Config struct {
	Hostname     string `json:"hostname"`
	Port         uint   `json:"port"`
	Host         string `json:"-"` // generated from the above
	Database     string `json:"database"`
	CookieSecret string `json:"cookie-secret"`
	Auth         map[string]struct {
		Key    string `json:"key"`
		Secret string `json:"secret"`
	} `json:"auth"`
}

var loadConfig = func() (*Config, error) {
	var err error
	// load config from file
	configPath := flag.String("config", defaultConfigPath,
		"Location of the config file.")
	// define flags
	hostname := flag.String("hostname", "",
		"Listen on the specified hostname.")
	port := flag.Uint("port", 0,
		"listen on the specified port")
	host := flag.String("host", "",
		"Listen on the specified host/port. Overrides other options")
	flag.Parse()
	configBytes, err := ioutil.ReadFile(*configPath)
	if err != nil {
		return nil, err
	}
	config := &Config{}
	err = json.Unmarshal(configBytes, config)
	// compute hostname
	if *host != "" {
		config.Host = *host
	} else {
		if *hostname != "" {
			config.Hostname = *hostname
		}
		if *port != 0 {
			config.Port = *port
		}
		if config.Hostname == "" {
			config.Hostname = "localhost"
		}
		if config.Port == 0 {
			config.Port = 8080
		}
		if config.Host == "" {
			config.Host = fmt.Sprintf("%s:%d", config.Hostname, config.Port)
		}
	}
	return config, nil
}
