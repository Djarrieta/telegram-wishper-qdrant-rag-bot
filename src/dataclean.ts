import { QdrantClient } from "@qdrant/js-client-rest";

async function cleanCollections() {
    // Initialize Qdrant client
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
    });

    try {
        // Get list of all collections
        const collections = await client.getCollections();
        console.log("Found collections:", collections.collections.map((c: { name: string }) => c.name));

        // Delete each collection
        for (const collection of collections.collections) {
            console.log(`Deleting collection: ${collection.name}`);
            await client.deleteCollection(collection.name);
            console.log(`Successfully deleted collection: ${collection.name}`);
        }

        console.log("All collections have been deleted successfully");
    } catch (error) {
        console.error("Error while cleaning collections:", error);
    }
}

// Run the cleanup
cleanCollections().catch(console.error);