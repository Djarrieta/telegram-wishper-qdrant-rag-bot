# Telegram Bot for Transcribed Notes and Semantic Search

This project is a Telegram bot that lets you save, search, and interact with your notes using both text and voice messages. Audio messages are automatically transcribed to text using Whisper ASR, and all notes are stored and semantically searchable using a vector database (Qdrant). The bot can classify your messages as either notes to save or questions to answer, and can retrieve relevant notes using semantic search.

---

## Getting Started

### Environment Configuration

Before running the application, you need to configure environment variables:

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local      # For manual setup
   cp .env.example .env.docker     # For podman-compose setup
   ```

2. **Edit the environment file(s) with your actual values:**
   - `TELEGRAM_TOKEN`: Your Telegram bot token from @BotFather
   - `GITHUB_SECRET`: Your GitHub Personal Access Token for AI model access
   - Other variables can remain as default values

### Quick Start: Run Everything with Podman Compose

You can run the entire application stack (Whisper ASR, Qdrant, and the Telegram bot) using Podman Compose:

```bash
# Make sure you have configured .env.docker with your secrets
podman-compose up -d
```

This will build and start all services as defined in `docker-compose.yml`.

You can check database UI in http://localhost:6333/dashboard
You can check if wishper service is up in http://localhost:9000/docs

---

### Manual Setup (Advanced)

1. **Install dependencies**
    ```bash
    bun install
    ```

   **Note:** Make sure you have configured `.env.local` with your secrets before starting the services.

2. **Start Whisper ASR Webservice (Speech-to-Text)**
    ```bash
    podman run -d -p 9000:9000 \
      -e ASR_MODEL=base \
      -e ASR_ENGINE=openai_whisper \
      onerahmet/openai-whisper-asr-webservice:latest
    ```
    This will start the transcription service on http://localhost:9000.

3. **Start Qdrant (Vector Database)**
    ```bash
    podman run -d -p 6333:6333 -p 6334:6334 \
      -v "$(pwd)/qdrant_storage:/qdrant/storage:z" \
      qdrant/qdrant
    ```
    This will start the Qdrant service on http://localhost:6333.

4. **Start the bot**
    ```bash
    bun run src/runBot.ts
    ```

---



