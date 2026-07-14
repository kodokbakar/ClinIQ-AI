# Use the official Bun image
FROM oven/bun:1.3.14 as builder

WORKDIR /app
COPY . .

RUN bun install

RUN bun run build --filter=api

FROM oven/bun:1.3.14 as runner
WORKDIR /app

COPY --from=builder /app .

EXPOSE 8080

CMD ["bun", "run", "start", "--filter=api"]
