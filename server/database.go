package partycast

import (
	"database/sql"
	"encoding/gob"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

var (
	db *sqlx.DB
)

func init() {
	gob.Register(&Profile{})
}

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
	handleErr := func(err error) {
		if err != nil {
			fmt.Println(err)
		}
	}
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
	handleErr(err)
	_, err = tx.Exec(`CREATE TABLE IF NOT EXISTS auth (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		provider varchar(16) NOT NULL,
		uid varchar(64) NOT NULL,
		pid int,
		FOREIGN KEY (pid) REFERENCES profile(id),
		CONSTRAINT scoped_uid UNIQUE (provider, uid),
		CONSTRAINT single_link UNIQUE (provider, pid)
	)`)
	handleErr(err)
	_, err = tx.Exec(`CREATE TABLE IF NOT EXISTS room (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		name varchar(128)
	)`)
	handleErr(err)
	_, err = tx.Exec(`CREATE TABLE IF NOT EXISTS role (
		id int NOT NULL PRIMARY KEY AUTO_INCREMENT,
		rid int,
		type varchar(16) NOT NULL,
		FOREIGN KEY (rid) REFERENCES room(id)
	)`)
	handleErr(err)
	err = tx.Commit()
	handleErr(err)

	return nil
}

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

func insertAuth(a *Auth) error {
	result, err := db.NamedExec("INSERT INTO auth (provider, uid, pid) VALUES (:provider, :uid, :pid)", a)
	if err != nil {
		return err
	}
	a.ID, err = result.LastInsertId()
	return err
}

func removeAuth(a *Auth) error {
	_, err := db.NamedExec("DELETE FROM auth WHERE id=:id", a)
	return err
}

type Profile struct {
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

func insertProfile(p *Profile) error {
	result, err := db.NamedExec("INSERT INTO profile (name, email) VALUES (:name, :email)", p)
	if err != nil {
		return err
	}
	p.ID, err = result.LastInsertId()
	return err
}

func updateProfile(p *Profile) error {
	_, err := db.NamedExec("UPDATE profile SET name=:name, email=:email WHERE id=:id", p)
	return err
}

type Role struct {
	ID        int64  `json:"-", db:"id"`
	RoomID    int64  `json:"-", db:"rid"`
	ProfileID int64  `json:"pid", db:"pid"`
	Type      string `json:"role", db:"type"`
}

const (
	RoleAdmin = "admin"
)

type Room struct {
	ID     int64  `json:"rid", db:"id"`
	Name   string `json:"name", db:"name"`
	Admins []Role `json:"admins", db:"-"`
}
