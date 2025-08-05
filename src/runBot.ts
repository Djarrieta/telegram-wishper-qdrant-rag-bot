import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { NotesService } from "./services/NotesService";
import { AgentService } from "./services/AgentService";
import { WhisperASRService } from "./services/WhisperASRService";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const MODEL_ENDPOINT = process.env.MODEL_ENDPOINT || "";
const MODEL = process.env.MODEL || "";
const GITHUB_SECRET = process.env.GITHUB_SECRET || "";
const DB_URL = process.env.DB_URL || '';
const DB_COLLECTION_NAME = process.env.DB_COLLECTION_NAME || '';
const TRANSCRIPTION_API_URL = process.env.TRANSCRIPTION_API_URL || '';

const bot = new Telegraf(TELEGRAM_TOKEN);

const notesService = new NotesService({
    url: DB_URL,
    collectionName: DB_COLLECTION_NAME
});
const agentService = new AgentService({
    modelEndpoint: MODEL_ENDPOINT,
    model: MODEL,
    githubSecret: GITHUB_SECRET
});

const whisper = new WhisperASRService(TRANSCRIPTION_API_URL);

bot.on(message("text"), async (ctx) => {
    let userInput = ctx.message.text;
    await handleUserInput(ctx, userInput);
});

bot.on(message("voice"), async (ctx) => {
    const fileId = ctx.message.voice.file_id;
    if (!fileId) {
        await ctx.reply("No se pudo obtener el archivo de audio.");
        return;
    }
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const audioBlob = await response.blob();
    const file = new File([audioBlob], `${fileId}.ogg`, { type: "audio/ogg" });
    let userInput = "";
    try {
        const result = await whisper.transcribe(file, { output: "text" });
        userInput = result.text;
    } catch (err) {
        await ctx.reply("Error transcribiendo el audio.");
        return;
    }
    await handleUserInput(ctx, userInput);
});

async function handleUserInput(ctx: any, userInput: string) {
    const intent = await agentService.classifyIntent(userInput);
    let response = "";
    if (intent === "note") {
        await notesService.create({
            id: Date.now(),
            payload: { content: userInput }
        });
        response = "Nota guardada";
    } else {
        const notesResults = await notesService.search(userInput, 3);
        response = await agentService.generateResponse(notesResults, userInput);
    }
    await ctx.reply(response);
}

bot.launch();