export interface QueryResponse {
  answer: string;
  sources: string[];
}

const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8001';

export async function queryWorker(question: string): Promise<QueryResponse> {
  const res = await fetch(`${WORKER_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }

  return data as QueryResponse;
}
