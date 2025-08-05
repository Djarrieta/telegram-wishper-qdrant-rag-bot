export interface TranscribeOptions {
  output?: "text" | "json" | "vtt" | "srt" | "tsv";
  task?: "transcribe" | "translate";
  language?: string;
  [key: string]: any;
}

export interface TranscribeResult {
  text: string;
  segments?: any[];
  language?: string;
  [key: string]: any;
}

export class WhisperASRService {
  private baseUrl: string;

  constructor(baseUrl:string) {
    this.baseUrl = baseUrl
  }

  async transcribe(
    file: File | Blob,
    options: TranscribeOptions = {}
  ): Promise<TranscribeResult> {
    const formData = new FormData();
    formData.append("audio_file", file);
    const params = new URLSearchParams();
    if (options.output) params.append("output", options.output);
    if (options.task) params.append("task", options.task);
    if (options.language) params.append("language", options.language);
    // Add any other options
    for (const [k, v] of Object.entries(options)) {
      if (!["output", "task", "language"].includes(k) && v !== undefined) {
        params.append(k, String(v));
      }
    }
    const url = `${this.baseUrl}/asr?${params.toString()}`;
    const res = await fetch(url, {
      method: "POST",
      body: formData as any,
    });
    if (!res.ok) {
      throw new Error(`WhisperASRService: HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    } else {
      // fallback: treat as text
      return { text: await res.text() };
    }
  }
}
