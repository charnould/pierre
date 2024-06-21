#!/bin/bash -e

# create_folders
# A bash function to initiate needed folder structure.
# BTW, it won't work on production.
cleanup () {

rm -rf $( pwd; )/telemetry/*
mkdir -p $( pwd; )/telemetry

}

# init_db
# A bash function to initiate both locally and on prod server.
init_db () {

sqlite3 utils/knowledge/datastore.sqlite <<EOF
.load './utils/binaries/vector0'
.load './utils/binaries/vss0'
EOF

sqlite3 telemetry/datastore.sqlite "CREATE TABLE IF NOT EXISTS telemetry (uuid TEXT, config TEXT, role TEXT, timestamp TEXT, content TEXT);";

}

# download database
download_db () {
    
    sqlite3 $( pwd; )/telemetry/datastore.sqlite "VACUUM INTO '$( pwd; )/telemetry/backup.sqlite'";    
    scp $( pwd; )/telemetry/backup.sqlite /Desktop
    rm -f $( pwd; )/telemetry/backup.sqlite

    }


    
"$@"