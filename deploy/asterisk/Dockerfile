FROM andrius/asterisk:18

USER root

# Install ODBC drivers and gettext-base for envsubst
RUN apt-get update && apt-get install -y \
    unixodbc \
    odbc-postgresql \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create dummy file and give ownership to asterisk user for runtime substitution
RUN touch /etc/odbc.ini && chown asterisk:asterisk /etc/odbc.ini

USER asterisk

ENTRYPOINT ["/entrypoint.sh"]
