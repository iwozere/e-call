# Ensures 05-compute-call-host.sh is always executable (bind mounts from Windows/Git often lose +x).
FROM nginx:alpine
COPY docker-entrypoint.d/05-compute-call-host.sh /docker-entrypoint.d/05-compute-call-host.sh
RUN chmod +x /docker-entrypoint.d/05-compute-call-host.sh
