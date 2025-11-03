import { QdrantClient } from "@qdrant/js-client-rest";
import { pipeline } from "@xenova/transformers";
const pdfTextExtract = require("pdf-text-extract");

// Configuration
const COLLECTION_NAME = "knowledge";
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const PDF_PATH = "data.pdf"; // Replace with your PDF path

async function getEmbedding(text: string) {
    // Load the embedding model
    const embedder = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
    );

    // Generate embedding
    const output = await embedder(text, {
        pooling: "mean",
        normalize: true,
    });

    return Array.from(output.data);
}

async function createCollection(client: QdrantClient) {
    try {
        // Check if collection exists
        const collections = await client.getCollections();
        const exists = collections.collections.some(
            (collection) => collection.name === COLLECTION_NAME
        );

        if (!exists) {
            // Create new collection
            await client.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: 384, // all-MiniLM-L6-v2 embedding size
                    distance: "Cosine",
                },
            });
            console.log(`Created new collection: ${COLLECTION_NAME}`);
        }
    } catch (error) {
        console.error("Error creating collection:", error);
        throw error;
    }
}

function loadPdfContent(): Promise<string> {
    return new Promise((resolve, reject) => {
        pdfTextExtract(PDF_PATH, (err: any, pages: string[]) => {
            if (err) {
                reject(err);
            } else {
                resolve(pages.join("\n"));
            }
        });
    });
}

async function main() {
    try {
        // Initialize Qdrant client
        const client = new QdrantClient({
            url: process.env.QDRANT_URL || '',
        });

        // Create collection if it doesn't exist
        await createCollection(client);

        // Load PDF content
        console.log("Loading PDF content...");
        const text = await loadPdfContent();

        // Split text into chunks
        const chunks = [];
        let startIndex = 0;
        
        while (startIndex < text.length) {
            const endIndex = startIndex + CHUNK_SIZE;
            const chunk = text.slice(startIndex, endIndex);
            chunks.push({
                pageContent: chunk,
                metadata: { start: startIndex, end: endIndex }
            });
            startIndex = endIndex - CHUNK_OVERLAP;
        }

        // Process chunks and upload to Qdrant
        console.log(`Processing ${chunks.length} chunks...`);
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await getEmbedding(chunk.pageContent);

            await client.upsert(COLLECTION_NAME, {
                wait: true,
                points: [
                    {
                        id: i,
                        vector: embedding,
                        payload: {
                            text: chunk.pageContent,
                            metadata: chunk.metadata,
                        },
                    },
                ],
            });

            console.log(`Processed chunk ${i + 1}/${chunks.length}`);
        }

        console.log("PDF content successfully loaded into Qdrant!");
    } catch (error) {
        console.error("Error processing PDF:", error);
    }
}

main();