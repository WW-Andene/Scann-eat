FROM node:22-alpine

WORKDIR /app

COPY scoring-engine.ts ocr-parser.ts server.ts ./
COPY web ./web

ENV PORT=8080
EXPOSE 8080

CMD ["node", "--experimental-strip-types", "server.ts"]
