// Check if Ollama server is running by attempting to preload 'bge-m3' model.
// - Uses the /api/embed endpoint to trigger model loading.
// - Sets `keep_alive: -1` to keep the model loaded in memory.
// - If Ollama is not running or the request fails, exit the process with an error.
export const ollama_check = async () => {
  await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'bge-m3', keep_alive: -1 })
  }).catch(() => {
    console.error('Ollama is not running.')
    console.error('→ Run `ollama serve` in one terminal.')
    console.error('→ Run `bun dev` in another.')
    process.exit(1)
  })
}
