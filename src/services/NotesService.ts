import { QdrantClient } from '@qdrant/js-client-rest';
import { pipeline } from '@xenova/transformers';

export interface Note {
    id: number;
    payload?: Record<string, any>;
}

export class NotesService {
    private client: QdrantClient;
    private collectionName: string;

    constructor({ url = '', collectionName = '' }: { url?: string; collectionName?: string } = {}) {
        this.client = new QdrantClient({ url });
        this.collectionName = collectionName;
    }

    async createCollectionIfNotExists(vectorSize: number) {
        try {
            const info = await this.client.getCollection(this.collectionName);
            const currentSize = info.config?.params?.vectors?.size;
            if (typeof currentSize === 'number' && currentSize !== vectorSize) {
                throw new Error(
                    `Collection '${this.collectionName}' exists with vector size ${currentSize}, but tried to insert vector of size ${vectorSize}`
                );
            }
        } catch (e: any) {
            if (e?.status === 404 || e?.message?.includes('not found')) {
                await this.client.createCollection(this.collectionName, {
                    vectors: { size: vectorSize, distance: 'Cosine' },
                });
            } else {
                throw e;
            }
        }
    }

    async create(note: Note): Promise<void> {
        if (!note.payload || !note.payload["content"]) {
            throw new Error('Content required in payload to create a note');
        }
        const vector = Array.from(await this.generateTextEmbedding(note.payload["content"]));
        await this.createCollectionIfNotExists(vector.length);
        try {
            await this.client.upsert(this.collectionName, {
                points: [
                    {
                        id: note.id,
                        vector: vector,
                        payload: note.payload || {},
                    },
                ],
                wait: true,
            });
        } catch (e: any) {
            console.error('Failed to upsert note:', e);
            console.error('Full error object:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
            throw e;
        }
    }

    async search(query: string, limit: number = 5, scoreThreshold?: number): Promise<Array<Note & { score: number }>> {
        const queryVector = Array.from(await this.generateTextEmbedding(query));

        const searchResults = await this.client.search(this.collectionName, {
            vector: queryVector,
            limit: limit,
            score_threshold: scoreThreshold,
        });

        return searchResults.map(result => ({
            id: result.id as number,
            payload: result.payload ?? undefined,
            score: result.score,
        }));
    }

    async read(noteId: number): Promise<Note | undefined> {
        const result = await this.client.retrieve(this.collectionName, {
            ids: [noteId],
        });
        const point = result[0];
        if (!point) return undefined;
        return {
            id: point.id as number,
            payload: point.payload ?? undefined,
        };
    }

   

    async delete(noteId: number): Promise<boolean> {
        await this.client.delete(this.collectionName, {
            points: [noteId],
        });
        return true;
    }

    private async generateTextEmbedding(text: string): Promise<Float32Array> {
        try {
            const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            const output = await extractor(text, { pooling: 'mean', normalize: true });
            return output.data as Float32Array;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate text embedding.');
        }
    }
}
