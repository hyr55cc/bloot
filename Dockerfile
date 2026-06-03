# Baloot Game Server
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/rooms', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["npm", "start"]