import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { WhisperASRService } from "./services/WhisperASRService";
import { MCPAgentService } from "./services/MCPAgentService";


const bot = new Telegraf(process.env.TELEGRAM_TOKEN || '');
const whisper = new WhisperASRService(process.env.TRANSCRIPTION_API_URL || '');
const mcpService = MCPAgentService.getInstance(
  process.env.API_KEY || '',
  process.env.MODEL || '',
  process.env.BASE_URL || ''
);

// Initialize the MCP agent when the bot starts
mcpService.initialize().catch(err => {
    console.error("Failed to initialize MCP agent:", err);
    process.exit(1);
});

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
        const result = await mcpService.run(userInput);
        
        // Add permanent reply keyboard buttons
        await ctx.reply(result, Markup.keyboard([
            ['Option 1', 'Option 2']
        ]).resize());
    } catch (err) {
        console.error("Error:", (err as Error).message);
        await ctx.reply("Lo siento, ocurrió un error al procesar tu mensaje.");
    }
}

// Handle text messages from keyboard buttons
bot.hears('Option 1', async (ctx) => {
    await ctx.reply('You selected Option 1!');
});

bot.hears('Option 2', async (ctx) => {
    await ctx.reply('You selected Option 2!');
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => {
    mcpService.close().then(() => {
        bot.stop('SIGINT');
    });
});

process.once('SIGTERM', () => {
    mcpService.close().then(() => {
        bot.stop('SIGTERM');
    });
});