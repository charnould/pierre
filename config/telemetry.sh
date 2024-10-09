#!/bin/bash -e

init_db () {
     mkdir -p telemetry
     sqlite3 telemetry/datastore.sqlite "CREATE TABLE IF NOT EXISTS telemetry (conv_id TEXT, config TEXT, model TEXT, role TEXT, timestamp TEXT, content TEXT, cus_satisfaction INTEGER, org_satisfaction INTEGER, ext_satisfaction INTEGER, cus_comment TEXT, org_comment TEXT, ext_comment TEXT, prompt_tokens INTEGER, completion_tokens INTEGER, total_tokens INTEGER);";
     }

reset_db () {
    sqlite3 telemetry/datastore.sqlite "DELETE FROM telemetry; VACUUM;";
     }

 "$@"