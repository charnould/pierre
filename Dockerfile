FROM oven/bun:latest

WORKDIR /app

COPY . .

RUN <<EOF
    apt-get update
    apt-get -y install curl
    apt-get -y install sqlite3
    apt-get -y install libgomp1 libatlas-base-dev liblapack-dev libsqlite3-dev
    bun install --production
EOF

LABEL org.opencontainers.image.url https://github.com/charnould/pierre/pkgs/container/pierre
LABEL org.opencontainers.image.source https://github.com/charnould/pierre
LABEL org.opencontainers.image.description "pierre container image"
LABEL org.opencontainers.image.title "pierre container image"

EXPOSE 3000

CMD ["bun", "start"]