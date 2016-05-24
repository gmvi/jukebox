package partycast

import (
	_ "database/sql"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

var (
	db *sqlx.DB
)

func ConnectDatabase() error {
	var err error
	db, err = sqlx.Connect("mysql", config.Database)
	if err != nil {
		return err
	}
	err = db.Ping() // fail early
	if err != nil {
		return err
	}

	// create if not exists
	tx, _ := db.Begin()
	tx.Exec(`DROP TABLE role`)
	tx.Exec(`DROP TABLE room`)
	tx.Exec(`DROP TABLE auth`)
	tx.Exec(`DROP TABLE profile`)
	_, err = tx.Exec(`CREATE TABLE IF NOT EXISTS profile (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		name varchar(64) NOT NULL,
		email varchar(64) NOT NULL UNIQUE
	)`)
	if err != nil {
		fmt.Println(err)
	}
	_, err = tx.Exec(`CREATE TABLE IF NOT EXISTS auth (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		provider_name varchar(16) NOT NULL,
		provider_uid varchar(64) NOT NULL,
		pid int,
		FOREIGN KEY (pid) REFERENCES profile(id),
		CONSTRAINT scoped_uid UNIQUE (provider_name, provider_uid),
		CONSTRAINT single_link UNIQUE (provider_name, pid)
	)`)
	if err != nil {
		fmt.Println(err)
	}
	_, err = tx.Exec(`CREATE TABLE IF NOT EXISTS room (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		name varchar(128)
	)`)
	if err != nil {
		fmt.Println(err)
	}
	_, err = tx.Exec(`CREATE TABLE IF NOT EXISTS role (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		rid int,
		FOREIGN KEY (rid) REFERENCES room(id),
		type varchar(16) NOT NULL
	)`)
	if err != nil {
		fmt.Println(err)
	}
	err = tx.Commit()
	if err != nil {
		fmt.Println(err)
	}

	return nil
}

type Auth struct {
	ID          int    `db:"id"`
	Provider    string `db:"provider_name"`
	ProviderUID int    `db:"provider_uid"`
	ProfileID   int    `db:"profile"`
	Profile     *Profile
}

type Profile struct {
	ID    int    `json:"pid",db:"id"`
	Name  string `json:"name",db:"name"`
	Email string `json:"email,db:"email"`
}

type Role struct {
	ID        int    `json:"-",db:"id"`
	RoomID    int    `json:"-",db:"rid"`
	ProfileID int    `json:"pid",db:"pid"`
	Type      string `json:"role",db:"type"`
}

type Room struct {
	ID     int    `json:"rid",db:"id"`
	Name   string `json:"name",db:"name"`
	Admins []Role `json:"admins"`
}
