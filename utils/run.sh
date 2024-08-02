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

# sqlite3 utils/knowledge/datastore.sqlite <<EOF
# .load './utils/binaries/vector0'
# .load './utils/binaries/vss0'
# EOF

sqlite3 telemetry/datastore.sqlite "CREATE TABLE IF NOT EXISTS telemetry (id TEXT, config TEXT, role TEXT, timestamp TEXT, content TEXT, user_score INTEGER, reviewer_score INTEGER, reviewer_comment TEXT, prompt_tokens INTEGER, completion_tokens INTEGER, total_tokens INTEGER);";

}

"$@"