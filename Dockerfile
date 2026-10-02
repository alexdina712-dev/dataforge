FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate && pnpm install --frozen-lockfile
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
RUN pnpm build
FROM python:3.12.14-slim-bookworm
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt && useradd --create-home dataforge
COPY backend/app ./backend/app
COPY samples ./samples
COPY --from=web /app/dist ./dist
USER dataforge
ENV SERVE_WEB=true ENVIRONMENT=development APP_ORIGIN=http://localhost:8080
EXPOSE 8080
CMD ["python","-m","uvicorn","app.main:app","--app-dir","backend","--host","0.0.0.0","--port","8080","--workers","1","--limit-concurrency","20","--no-access-log"]
