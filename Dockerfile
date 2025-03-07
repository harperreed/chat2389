FROM node:18-slim as frontend-builder

WORKDIR /app

# Copy frontend dependency files
COPY package.json /app/
# package-lock.json might not exist yet, so make it conditional
COPY package*.json /app/

# Install Node.js dependencies
RUN npm install

# Copy frontend source
COPY src/ /app/src/

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Build the frontend
RUN npm run build

# Copy dependency files
COPY pyproject.toml /app/

# Copy application code
COPY server.py /app/

# Expose the port
EXPOSE 5000

# Run with gunicorn for production
CMD ["uv","run","gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--access-logfile", "-", "server:app"]
