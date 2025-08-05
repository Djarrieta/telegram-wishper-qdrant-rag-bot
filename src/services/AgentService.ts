import OpenAI from "openai";
import type { Note } from "./NotesService";

// Allowed response formats for OpenAI Whisper API
export type AudioResponseFormat = "json" | "text" | "srt" | "verbose_json" | "vtt";

export class AgentService {
  private client: OpenAI;
  private model: string;

  constructor({ modelEndpoint, model, githubSecret }: { modelEndpoint: string; model: string; githubSecret: string; }) {
    this.client = new OpenAI({ baseURL: modelEndpoint, apiKey: githubSecret });
    this.model = model;
  }

  async generateResponse(notes: Array<Note & { score: number }>, userInput: string): Promise<string> {
    const notesContext = this.buildNotesContext(notes);
    const response = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: `
            Eres un agente que responde preguntas basadas en notas guardadas.
            Responde con la información más relevante de las notas guardadas teniendo en cuenta el score que está en los datos.
            Si no hay notas relevantes, responde con "No se encontraron notas relevantes" o algo similar.
            Contexto de notas guardadas:\n${notesContext}` },
        { role: "user", content: userInput }
      ],
      temperature: 1,
      top_p: 1,
      model: this.model
    });
    
    return response.choices[0].message.content || "";
  }

  async classifyIntent(userInput: string): Promise<"note" | "question"> {
    const response = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: "Eres un asistente que clasifica mensajes como 'nota' o 'pregunta'. Si el mensaje es información para guardar, responde solo 'nota'. Si es una pregunta, responde solo 'pregunta'." },
        { role: "user", content: userInput }
      ],
      temperature: 0,
      top_p: 1,
      model: this.model
    });
    const content = response.choices[0].message.content?.toLowerCase().trim();
    if (content?.includes("nota")) return "note";
    return "question";
  }

  private buildNotesContext(notes: Array<Note & { score: number }>): string {
    if (!notes.length) return "No relevant notes found.";
    return notes
      .sort((a, b) => b.score - a.score)
      .map(n => {
        const date = new Date(Number(n.id));
        const formattedDate = isNaN(date.getTime()) ? n.id : date.toLocaleString();
        return `Note (created: ${formattedDate}, score: ${n.score}): ${n.payload?.content || ""}`;
      })
      .join("\n");
  }

}
