FROM oven/bun:latest

WORKDIR /app

ENV PATH="/root/.local/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget iproute2 nftables procps sudo sqlite3 openssh-client \
    imagemagick ghostscript \
    libvirglrenderer1 \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://smolmachines.com/install.sh | bash -s -- --version 1.0.4 \
    && test -x /root/.smolvm/smolvm \
    && ln -sf /root/.smolvm/smolvm /usr/local/bin/smolvm

COPY package.json bun.lock ./
COPY server/package.json ./server/
COPY docs/package.json ./docs/
COPY desktop/package.json ./desktop/
COPY customization/package.json ./customization/
RUN bun install --frozen-lockfile --production --filter @pierre/server

COPY customization/ ./customization/
COPY config/smolvm/pierre-amd64 ./config/smolvm/pierre-amd64
COPY config/smolvm/pierre-amd64.smolmachine ./config/smolvm/pierre-amd64.smolmachine
COPY server/ ./server/

WORKDIR /app/server

# Kamal mounts persistent data at /app/datastores; the app uses cwd-relative paths.
RUN mkdir -p /app/datastores && ln -sf /app/datastores datastores

EXPOSE 3000

CMD ["bun", "start"]
