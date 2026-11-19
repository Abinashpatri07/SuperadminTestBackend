# Use lightweight official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for cached dependency installation
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application files
COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads

# Expose backend port
EXPOSE 5002

# Set default environment variables
ENV NODE_ENV=production \
    PORT=5002

# Start server
CMD ["node", "src/server.js"]
