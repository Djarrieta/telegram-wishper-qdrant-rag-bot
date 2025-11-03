import puppeteer from 'puppeteer';
import { Markup, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { MCPAgentService } from "./services/MCPAgentService";
import { WhisperASRService } from "./services/WhisperASRService";


const bot = new Telegraf(process.env.TELEGRAM_TOKEN || '');
const whisper = new WhisperASRService(process.env.TRANSCRIPTION_API_URL || '');
const mcpService = MCPAgentService.getInstance(
    process.env.API_KEY || '',
    process.env.MODEL || '',
    process.env.BASE_URL || ''
);

const permanentKeyboardOptions = ['Option 1', 'Option 2']

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
    if (permanentKeyboardOptions.includes(userInput)) {
        if (userInput === permanentKeyboardOptions[0]) {
            await ctx.reply('Capturing CoinMarketCap charts screenshot...');
            try {
                const screenshot = await captureChartScreenshot();
                await ctx.replyWithPhoto({ source: screenshot });
            } catch (error) {
                console.error('Screenshot error:', error);
                await ctx.reply('Sorry, there was an error capturing the screenshot.');
            }
        }
        if (userInput === permanentKeyboardOptions[1]) {
            await ctx.reply('You selected Option 2. This feature is coming soon!');
        }
        return;
    }


    try {
        const result = await mcpService.run(userInput);

        // Add permanent reply keyboard buttons
        await ctx.reply(result, Markup.keyboard([
            permanentKeyboardOptions
        ]).resize());
    } catch (err) {
        console.error("Error:", (err as Error).message);
        await ctx.reply("Lo siento, ocurrió un error al procesar tu mensaje.");
    }
}

// Function to capture screenshot
async function captureChartScreenshot(): Promise<Buffer> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        await page.goto('https://coinmarketcap.com/charts/', {
            waitUntil: 'networkidle0',
        });

        await Bun.sleep(2000);

        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false
        });

        return screenshot as Buffer;
    } finally {
        await browser.close();
    }
}

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