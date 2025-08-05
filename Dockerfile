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

# Set environment variables (override in compose or at runtime as needed)
# ENV TELEGRAM_TOKEN=your_token
# ENV MODEL_ENDPOINT=your_endpoint
# ENV MODEL=your_model
# ENV GITHUB_SECRET=your_secret
# ENV DB_URL=your_db_url
# ENV DB_COLLECTION_NAME=your_collection
# ENV TRANSCRIPTION_API_URL=your_transcription_url

# Run the bot (adjust entrypoint if needed)
CMD ["bun", "run", "src/runBot.ts"]
