#!/bin/bash -e

init_db () {
    
    # Ensure that `telemetry` folder exists.
    # If `telemetry` directory already exists, it won’t raise any errors.
    mkdir -p telemetry

    # Create `datastore.sqlite` if it does not exist,
    # and create `telemetry` table with schema below.
    sqlite3 telemetry/datastore.sqlite <<EOF

        CREATE TABLE IF NOT EXISTS telemetry (
            conv_id TEXT,
            config TEXT,
            role TEXT,
            timestamp TEXT,
            content TEXT,
            metadata TEXT
        );
EOF
}

 "$@"