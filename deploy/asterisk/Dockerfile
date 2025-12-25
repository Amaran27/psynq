FROM debian:bullseye-slim

USER root

# Install Asterisk, ODBC drivers and gettext-base for envsubst
RUN apt-get update && apt-get install -y \
    asterisk \
    unixodbc \
    odbc-postgresql \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create dummy file and give ownership to asterisk user for runtime substitution
RUN touch /etc/odbc.ini && chown asterisk:asterisk /etc/odbc.ini

# USER asterisk

ENTRYPOINT ["/entrypoint.sh"]
