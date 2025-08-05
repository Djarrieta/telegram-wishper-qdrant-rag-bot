import { NotesService } from './services/NotesService';
import type { Note } from './services/NotesService';

async function createNote() {
  // Example note data
  const payload = {
    title: 'Sample Note 2',
    content: 'also i have a note with some content that is not related to the previous one',
  };
  // Generate embedding for the note content

  const note: Note = {
    id: Date.now(), // Unique ID based on timestamp
    payload
  };

  const service = new NotesService();
  try {
    await service.create(note);
  } catch (error) {
    console.error('Error creating note:', error);
  }
}

async function search() {
    const service = new NotesService();
    try {
        const results = await service.search('otra cosa que nada que ver', 5);
        console.log('Search results:', results);
    } catch (error) {
        console.error('Error searching notes:', error);
    }
}

createNote();
