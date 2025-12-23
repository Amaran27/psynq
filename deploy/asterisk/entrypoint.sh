#!/bin/bash
set -e

echo "Substituting environment variables in Asterisk templates..."

# List of templates to process
TEMPLATES=(
    "/etc/asterisk/odbc.ini.template:/etc/odbc.ini"
    "/etc/asterisk/res_odbc.conf.template:/etc/asterisk/res_odbc.conf"
    "/etc/asterisk/ari.conf.template:/etc/asterisk/ari.conf"
)

for entry in "${TEMPLATES[@]}"; do
    template="${entry%%:*}"
    target="${entry##*:}"
    if [ -f "$template" ]; then
        echo "Processing $template -> $target"
        envsubst < "$template" > "$target"
    else
        echo "Warning: Template $template not found."
    fi
done

# Start Asterisk
echo "Starting Asterisk..."
exec /usr/sbin/asterisk -f -vvvvv
