import { describe, expect, it } from 'vitest';
import { parseProcessFlow } from '../processParser';

describe('parseProcessFlow', () => {
  it('returns null for empty or non-string inputs', () => {
    expect(parseProcessFlow('')).toBeNull();
    expect(parseProcessFlow('   ')).toBeNull();
    // @ts-expect-error test invalid type
    expect(parseProcessFlow(null)).toBeNull();
  });

  it('parses single line arrow-delimited flow', () => {
    const raw = 'Step 1: Ingestion -> Step 2: Indexing -> Step 3: Retrieval';
    const steps = parseProcessFlow(raw);
    expect(steps).not.toBeNull();
    expect(steps).toHaveLength(3);
    expect(steps![0]).toEqual({ number: 1, title: 'Step 1', description: 'Ingestion' });
    expect(steps![1]).toEqual({ number: 2, title: 'Step 2', description: 'Indexing' });
    expect(steps![2]).toEqual({ number: 3, title: 'Step 3', description: 'Retrieval' });
  });

  it('parses multi-line standard process steps with title and description', () => {
    const raw = `
Step 1: Document Upload -> User selects and uploads a PDF file
Step 2: Text Extraction -> Document text and metadata are extracted
Step 3: Chunking & Embeddings -> Text is split into chunks and embedded
Step 4: Vector Storage -> Embeddings are saved to the vector database
`;
    const steps = parseProcessFlow(raw);
    expect(steps).not.toBeNull();
    expect(steps).toHaveLength(4);
    expect(steps![0].title).toBe('Document Upload');
    expect(steps![0].description).toBe('User selects and uploads a PDF file');
    expect(steps![3].title).toBe('Vector Storage');
    expect(steps![3].description).toBe('Embeddings are saved to the vector database');
  });

  it('parses Mermaid-style arrows cleanly', () => {
    const raw = `
graph LR
A[Upload Document] --> B[Parse PDF]
B --> C[Generate Embeddings]
C --> D[Query LLM]
`;
    const steps = parseProcessFlow(raw);
    expect(steps).not.toBeNull();
    expect(steps).toHaveLength(4);
    expect(steps![0].title).toBe('Upload Document');
    expect(steps![1].title).toBe('Parse PDF');
    expect(steps![2].title).toBe('Generate Embeddings');
    expect(steps![3].title).toBe('Query LLM');
  });

  it('returns null if there are fewer than 2 valid steps', () => {
    const raw = 'Step 1: Only single step';
    expect(parseProcessFlow(raw)).toBeNull();
  });
});
