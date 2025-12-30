# Use community-recommended Asterisk image (andrius/asterisk)
# Reference: https://community.asterisk.org/t/are-there-any-official-good-docker-images-available/92609
# This is the de-facto standard with 10M+ pulls and active maintenance
FROM andrius/asterisk:latest

# Switch to root to install packages
USER root

# Install PostgreSQL ODBC driver for CDR logging
RUN apt-get update && apt-get install -y \
    odbc-postgresql \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Switch back to asterisk user
USER asterisk

# The image is already configured with Asterisk
# Just use the default entrypoint
