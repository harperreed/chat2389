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

# Build the frontend
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

# Copy dependency files
COPY pyproject.toml /app/
COPY requirements.txt /app/

# Install dependencies - make sure we have the latest pip
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py /app/

# Copy built frontend from the frontend builder stage
COPY --from=frontend-builder /app/public/ /app/public/

# Expose the port
EXPOSE 5000

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--access-logfile", "-", "server:app"]