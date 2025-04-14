CREATE TABLE ALAT (
    alat_id INTEGER PRIMARY KEY,
    ets_id TEXT,
    naziv TEXT,
    bar_kod INTEGER,
    datum_ulaza DATETIME,
    id_model TEXT,
    id_proizvodjac INTEGER,
    id_kategorija INTEGER,
    id_tip_izdavanja INTEGER,
    id_status INTEGER,
    vrijednost DECIMAL(18, 2),
    id_kistra INTEGER,
    garancija_u_godinama INTEGER
);

CREATE TABLE IZDAVANJE (
    barcode INTEGER,
    izdavanje_id TEXT PRIMARY KEY,
    nalog_id TEXT,
    datum_od DATETIME,
    datum_do DATETIME,
    status INTEGER,
    id_uposlenik INTEGER,
    id_projekat INTEGER,
    FOREIGN KEY (barcode) REFERENCES ALAT (bar_kod),
    FOREIGN KEY (id_projekat) REFERENCES PROJEKAT (projekat_id),
    FOREIGN KEY (id_uposlenik) REFERENCES UPOSLENIK (uposlenik_id)
);

CREATE TABLE IZDAVANJE_TIP (
    tip_id INTEGER PRIMARY KEY,
    naziv TEXT
);

CREATE TABLE KATEGORIJA_TIP (
    kategorija_id INTEGER PRIMARY KEY,
    naziv TEXT
);

CREATE TABLE KISTRA (
    kistra_id INTEGER PRIMARY KEY
);

CREATE TABLE KOMPANIJA (
    kompanija_id INTEGER PRIMARY KEY,
    kompanija_naziv TEXT,
    kompanija_longitude INTEGER,
    kompanija_latitude INTEGER,
    kompanija_telefon TEXT,
    kompanija_email TEXT,
    kompanija_kontakt_osoba TEXT,
    kompanija_kontakt_telefon TEXT,
    id_tip_kompanije INTEGER,
    FOREIGN KEY (id_tip_kompanije) REFERENCES KOMPANIJA_TIP (kompanija_tip_id)
);

CREATE TABLE KOMPANIJA_TIP (
    kompanija_tip_id INTEGER PRIMARY KEY,
    naziv TEXT
);

CREATE TABLE KORISNIK_TIP (
    korisnik_tip_id INTEGER PRIMARY KEY,
    tip TEXT
);

CREATE TABLE MODEL_TIP (
    model_id TEXT PRIMARY KEY,
    naziv TEXT
);

CREATE TABLE PROIZVODJAC_TIP (
    proizvodjac_id INTEGER PRIMARY KEY,
    naziv TEXT
);

CREATE TABLE PROJEKAT (
    projekat_id INTEGER PRIMARY KEY,
    ugovor_id TEXT,
    kompanija TEXT,
    godina INTEGER
);

CREATE TABLE STATUS (
    status_id INTEGER PRIMARY KEY,
    id_stanje INTEGER,
    id_tip INTEGER,
    FOREIGN KEY (id_stanje) REFERENCES STATUS_STANJE (stanje_id),
    FOREIGN KEY (id_tip) REFERENCES STATUS_TIP (tip_id)
);

CREATE TABLE STATUS_STANJE (
    stanje_id INTEGER PRIMARY KEY,
    naziv TEXT
);

CREATE TABLE STATUS_TIP (
    tip_id INTEGER PRIMARY KEY,
    naziv TEXT
);

CREATE TABLE UPOSLENIK (
    uposlenik_id INTEGER PRIMARY KEY,
    uposlenik_ime TEXT,
    uposlenik_prezime TEXT,
    uposlenik_jmbg TEXT,
    uposlenik_broj_licneK TEXT,
    uposlenik_kontakt TEXT,
    id_uposlenik_tip INTEGER,
    FOREIGN KEY (id_uposlenik_tip) REFERENCES UPOSLENIK_TIP (tip_id)
);

CREATE TABLE UPOSLENIK_TIP (
    tip_id INTEGER PRIMARY KEY,
    tip TEXT
);

CREATE TABLE NALOG (
    nalog_id INTEGER PRIMARY KEY,
    uposlenik_id INTEGER,
    nalog_value TEXT,
    FOREIGN KEY (uposlenik_id) REFERENCES UPOSLENIK(uposlenik_id)
);


CREATE TABLE USERS (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL
);