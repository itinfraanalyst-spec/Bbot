FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY scripts/ ./scripts/
COPY --from=client-build /app/client/dist ./client/dist

ENV PYTHONPATH=/app
ENV API_HOST=0.0.0.0
ENV API_PORT=8000
ENV ENVIRONMENT=development
ENV COOKIE_SECURE=false
ENV ALLOWED_ORIGINS=*
ENV SINGLE_WORKER_CONFIRMED=true
ENV JWT_SECRET=trpw-default-super-secure-jwt-secret-key-32chars-minimum
ENV LLM_PROVIDER=groq

EXPOSE 8000

CMD ["sh", "scripts/start.sh"]
