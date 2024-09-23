#!/bin/bash -e

init_db () {
     mkdir -p telemetry
     sqlite3 telemetry/datastore.sqlite "CREATE TABLE IF NOT EXISTS telemetry (id TEXT, config TEXT, model TEXT, role TEXT, timestamp TEXT, content TEXT, user_score INTEGER, reviewer_score INTEGER, reviewer_comment TEXT, prompt_tokens INTEGER, completion_tokens INTEGER, total_tokens INTEGER);";
     }

reset_db () {
    sqlite3 telemetry/datastore.sqlite "DELETE FROM telemetry; VACUUM;";
     }

 "$@"