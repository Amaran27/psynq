CREATE TABLE IF NOT EXISTS ps_contacts (
    id varchar(255) PRIMARY KEY,
    uri varchar(255),
    expire_timestamp integer,
    qualify_frequency integer DEFAULT 0,
    qualify_timeout numeric(5,2) DEFAULT 3.0,
    path varchar(255),
    user_agent varchar(255),
    reg_server varchar(255)
);
