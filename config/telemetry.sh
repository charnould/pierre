#!/bin/bash -e

init_db () {
    
    # Ensure that `telemetry` folder exists.
    # If `telemetry` directory already exists, it won’t raise any errors.
    mkdir -p telemetry

    # Create `datastore.sqlite` if it does not exist.
    sqlite3 telemetry/datastore.sqlite <<EOF

        CREATE TABLE IF NOT EXISTS telemetry (
            conv_id TEXT,
            config TEXT,
            role TEXT,
            timestamp TEXT,
            content TEXT,
            metadata TEXT,
            UNIQUE(conv_id, timestamp)
        );
        
        CREATE TABLE IF NOT EXISTS users (
            config TEXT NOT NULL,
            email TEXT PRIMARY KEY UNIQUE NOT NULL,
            role TEXT NOT NULL,
            password_hash TEXT NOT NULL
        );
EOF
}

 "$@"