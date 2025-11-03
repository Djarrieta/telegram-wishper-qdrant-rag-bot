import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { WhisperASRService } from "./services/WhisperASRService";
import { closeMCP, runMCPAgent } from "./services/MCPAgentService";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const TRANSCRIPTION_API_URL = process.env.TRANSCRIPTION_API_URL || '';

const bot = new Telegraf(TELEGRAM_TOKEN);

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
    try {
        const result = await runMCPAgent(userInput);
        console.log(result);
        await closeMCP();
        await ctx.reply(result);
        process.exit(0);
    } catch (err) {
        console.error("Error:", (err as Error).message);
        process.exit(1);
    }
}

bot.launch();