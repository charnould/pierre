/** Reads a browser `File` as `ArrayBuffer` for IPC upload. */
export function readFileBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as ArrayBuffer)
    r.onerror = () => rej(r.error)
    r.readAsArrayBuffer(file)
  })
}
