FROM oven/bun:latest

WORKDIR /app

ENV PATH="/root/.local/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget iproute2 nftables procps sudo sqlite3 openssh-client \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://smolmachines.com/install.sh | bash \
    && test -x /root/.smolvm/smolvm \
    && ln -sf /root/.smolvm/smolvm /usr/local/bin/smolvm

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 3000

CMD ["bun", "start"]