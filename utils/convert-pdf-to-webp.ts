/**
 * Converts a PDF file to a base64-encoded WebP image data URL.
 *
 * Uses ImageMagick (IM) to process the PDF with the following transformations:
 * - Renders PDF at 200 DPI
 * - Converts to grayscale with white background
 * - Auto-levels the image
 * - Resizes to 65% of original
 * - Trims whitespace and adds 10px white border
 * - Compresses as WebP with quality 80
 *
 * @param file - A PDF File object to convert
 * @returns A promise that resolves to a data URL string in the format `data:image/webp;base64,...`
 * @throws {TypeError} If the input is not a File instance
 * @throws {Error} If the file is not a PDF, if ImageMagick fails, or if output is empty
 *
 */
export const convert_pdf_to_webp = async (file: File): Promise<string> => {
  // Throw if...
  if (!(file instanceof File)) throw new TypeError('convert_pdf_to_webp: input is not a File')
  if (!file.type || !file.type.includes('pdf'))
    throw new Error(`convert_pdf_to_webp: expected a PDF, got "${file.type}"`)

  // Spawn ImageMagick and stream PDF via stdin
  // prettier-ignore
  const proc = Bun.spawn(
    [
      'magick',
      '-density', '200',
      'pdf:-',
      '-background', 'white',
      '-alpha', 'remove',
      '-alpha', 'off',
      '-colorspace', 'Gray',
      '-auto-level',
      '-resize', '65%',
      '-trim',
      '+repage',
      '-bordercolor', 'white',
      '-border', '10x10',
      '-quality', '80',
      '-define', 'webp:method=6',
      '-define', 'webp:alpha-quality=90',
      '-append',
      'webp:-'
    ],
    {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe'
    }
  )

  try {
    // Write PDF bytes to ImageMagick stdin
    const buffer = await file.arrayBuffer()
    proc.stdin!.write(buffer)
    proc.stdin!.end()

    // Collect stdout/stderr in parallel
    const [stdout_buffer, stderr_text, exit_code] = await Promise.all([
      new Response(proc.stdout).arrayBuffer(),
      proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(''),
      proc.exited
    ])

    // Throw if...
    if (exit_code !== 0) throw new Error(`IM failed with exit code ${exit_code}: ${stderr_text}`)
    if (stdout_buffer.byteLength === 0) throw new Error('IM returned empty outputs')

    const b64 = Buffer.from(stdout_buffer).toString('base64')
    return `data:image/webp;base64,${b64}`
  } finally {
    // Ensure process is terminated in edge cases
    try {
      proc.kill()
    } catch {
      /* noop */
    }
  }
}
