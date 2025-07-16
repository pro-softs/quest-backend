# Use an official Node.js base image
FROM node:18-slim

# Install dependencies like FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json before copying rest of the code
COPY package*.json ./

# Install node modules
RUN npm install

# Copy the rest of the app code
COPY . .

# Expose your app's port (if applicable)
EXPOSE 3000

# Start your app
CMD ["npm", "start"]
