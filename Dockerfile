FROM oven/bun:latest

WORKDIR /app

COPY . .

RUN <<EOF
    apt-get update
    apt-get -y install curl
    apt-get -y install sqlite3
    apt-get -y install openssh-client
    apt-get -y install libgomp1 libatlas-base-dev liblapack-dev libsqlite3-dev
    bun install --production
EOF

EXPOSE 3000

CMD ["bun", "start"]