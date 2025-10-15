import { Mistral } from '@mistralai/mistralai'

/**
 * Converts a local PDF file into Markdown text using Mistral OCR.
 *
 * Steps:
 *  1. Validates environment variables and input.
 *  2. Encodes the PDF file as Base64.
 *  3. Sends it to the Mistral OCR API.
 *  4. Returns the extracted Markdown result.
 *
 * @param pdf_path - Absolute or relative path to the PDF file.
 * @returns The OCR result (Markdown text or structured data), or `null` if an error occurs.
 */
export const convert_pdf_to_markdown = async (pdf_path: string) => {
  // Environment variable validation
  if (!Bun.env.MISTRAL_API_KEY?.trim()) {
    console.error('[convert_pdf_to_markdown] Missing environment variable: MISTRAL_API_KEY')
    return null
  }

  // Input validation
  if (!pdf_path || !pdf_path.endsWith('.pdf')) {
    console.error(`[convert_pdf_to_markdown] Invalid file path or not a PDF: ${pdf_path}`)
    return null
  }

  try {
    // Perform OCR
    const client = new Mistral({ apiKey: Bun.env.MISTRAL_API_KEY })
    const base64_pdf = await encode_pdf(pdf_path)
    const ocr = await client.ocr.process({
      includeImageBase64: false,
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: 'data:application/pdf;base64,' + base64_pdf
      }
    })

    if (!ocr) {
      console.error('[convert_pdf_to_markdown] Empty OCR response received.')
      return null
    }

    let content = ''
    for (const page of ocr.pages) content += page.markdown
    return content
  } catch (e) {
    console.error('[convert_pdf_to_markdown] Unexpected error while OCRizing :', e)
    return null
  }
}

/**
 * Reads a PDF file from the given path and encodes it as a Base64 string.
 *
 * @param pdf_path - The absolute or relative path to the PDF file.
 * @returns Base64-encoded PDF content, or `null` if an error occurs.
 */
const encode_pdf = async (pdf_path: string) => {
  try {
    const pdf = Bun.file(pdf_path)
    const pdf_buffer = await pdf.bytes()
    const base64_pdf = pdf_buffer.toBase64()
    return base64_pdf
  } catch (e) {
    console.error(`[encode_pdf] Unexpected error while encoding ${pdf_path}:`, e)
    return null
  }
}

// image_url: `data:image/png;base64,${await encode_image('./tests/doc.png')}`
// image_url: `data:application/pdf;base64,${await encode_pdf('./tests/test.pdf')}`
