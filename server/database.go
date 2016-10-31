package jukebox

import (
	"database/sql"
	"encoding/gob"
	"fmt"
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

const (
	DEBUG = true
)

var (
	db *sqlx.DB
)

func init() {
	gob.Register(&Profile{})
}

func ConnectDatabase() error {
	var err error
	db, err = sqlx.Connect("sqlite3", config.Database)
	if err != nil {
		return err
	}
	err = db.Ping() // fail early
	if err != nil {
		return err
	}

	// create if not exists
	handleErr := func(err error) {
		if err != nil {
			fmt.Println(err)
		}
	}
	tx, _ := db.Begin()
	if DEBUG {
		tx.Exec(`DROP TABLE role`)
		tx.Exec(`DROP TABLE room`)
		tx.Exec(`DROP TABLE auth`)
		tx.Exec(`DROP TABLE profile`)
	}
	_, err = tx.Exec(`CREATE TABLE profile (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		name varchar(64) NOT NULL,
		email varchar(64) NOT NULL UNIQUE
	)`)
	handleErr(err)
	_, err = tx.Exec(`ALTER TABLE profile AUTO_INCREMENT=1`)
	handleErr(err)
	_, err = tx.Exec(`CREATE TABLE auth (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		provider varchar(16) NOT NULL,
		uid varchar(64) NOT NULL,
		pid int,
		FOREIGN KEY (pid) REFERENCES profile(id),
		CONSTRAINT scoped_uid UNIQUE (provider, uid),
		CONSTRAINT single_link UNIQUE (provider, pid)
	)`)
	handleErr(err)
	_, err = tx.Exec(`ALTER TABLE auth AUTO_INCREMENT=1`)
	handleErr(err)
	_, err = tx.Exec(`CREATE TABLE room (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		name varchar(128)
	)`)
	_, err = tx.Exec(`ALTER TABLE room AUTO_INCREMENT=1`)
	handleErr(err)
	handleErr(err)
	_, err = tx.Exec(`CREATE TABLE role (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		rid int,
		type varchar(16) NOT NULL,
		FOREIGN KEY (rid) REFERENCES room(id)
	)`)
	handleErr(err)
	_, err = tx.Exec(`ALTER TABLE role AUTO_INCREMENT=1`)
	handleErr(err)
	err = tx.Commit()
	handleErr(err)

	return nil
}

// Auth Table

type Auth struct {
	ID          int64  `db:"id"`
	Provider    string `db:"provider"`
	ProviderUID string `db:"uid"`
	ProfileID   int64  `db:"pid"`
}

func lookupAuth(provider, uid string) (*Auth, error) {
	auth := &Auth{}
	err := db.QueryRowx("SELECT * FROM auth WHERE provider=? AND uid=?", provider, uid).StructScan(auth)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	} else {
		return auth, nil
	}
}

func NewAuth(provider, providerUID string, profileID int64) (*Auth, error) {
	a := &Auth{}
	result, err := db.NamedExec("INSERT INTO auth (provider, uid, pid) VALUES (:provider, :uid, :pid)", a)
	if err != nil {
		return nil, err
	}
	a.ID, err = result.LastInsertId()
	return a, err
}

func (a *Auth) Remove() error {
	if a.ID == 0 {
		return nil
	}
	_, err := db.NamedExec("DELETE FROM auth WHERE id=:id", a)
	a.ID = 0
	return err
}

// Profile Table

type Profile struct {
	Guest bool   `db:"-", json:"-"`
	ID    int64  `db:"id", json:"pid"`
	Name  string `db:"name", json:"name"`
	Email string `db:"email", json:"email"`
}

func lookupProfile(email string) (*Profile, error) {
	profile := &Profile{}
	err := db.Get(profile, "SELECT * FROM profile WHERE email=?", email)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	} else {
		return profile, nil
	}
}

func (p *Profile) Save() error {
	if p.ID == 0 {
		result, err := db.NamedExec("INSERT INTO profile (name, email) VALUES (:name, :email)", p)
		if err != nil {
			return err
		}
		p.ID, err = result.LastInsertId()
		return err
	} else {
		_, err := db.NamedExec("UPDATE profile SET name=:name, email=:email WHERE id=:id", p)
		return err
	}
}

func (p *Profile) Remove() error {
	tx, _ := db.Beginx()
	//_, err := tx.NamedExec("REMOVE FROM")
	_, err := tx.NamedExec("REMOVE FROM profile WHERE id=:id", p)
	if err != nil {
		return err
	}
	return tx.Commit()
}

// Room Table

type Room struct {
	ID     int64  `json:"rid", db:"id"`
	Name   string `json:"name", db:"name"`
	Admins []Role `json:"admins", db:"-"`
}

// Role Table

type Role struct {
	ID        int64  `json:"-", db:"id"`
	RoomID    int64  `json:"-", db:"rid"`
	ProfileID int64  `json:"pid", db:"pid"`
	Type      string `json:"role", db:"type"`
}

const (
	RoleAdmin = "admin"
)
