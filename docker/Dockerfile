# ==========================================
# Stage 1: Build the React application
# ==========================================
FROM node:24-alpine AS builder

# Mute Node 24 deprecation warnings caused by Yarn v1
ENV NODE_OPTIONS="--no-deprecation"

# Set working directory inside the container
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies using Yarn with frozen lockfile to ensure consistent installs
RUN yarn install --frozen-lockfile

# Copy the rest of the application code into the container
COPY . .

# Build the React application
RUN yarn build

# ==========================================
# Stage 2: Serve the application with Nginx
# ==========================================
FROM nginx:alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built application from the builder stage to Nginx's default directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Force readable permissions for Nginx
RUN chmod -R 755 /usr/share/nginx/html

# Expose port 80 to allow external access to the application
EXPOSE 80

# Start Nginx in the foreground to keep the container running
CMD ["nginx", "-g", "daemon off;"]