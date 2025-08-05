# Use the official Bun image
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package and lock files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy the rest of the source code
COPY . .

# Run the bot (adjust entrypoint if needed)
CMD ["bun", "run", "src/runBot.ts"]
