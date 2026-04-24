/**
 * Converts a PDF or image file to a single PNG image using ImageMagick.
 *
 * Multi-page PDFs are appended vertically (all pages stacked) into one stripe.
 * Equivalent gm chain:
 *   gm(inputPath).density(150,150).quality(100).noProfile().colorspace('GRAY').threshold(50,true).append()
 *
 * Requires ImageMagick and Ghostscript to be installed on the host.
 */
export const convertToImage = async (inputPath: string, outputPath: string): Promise<void> => {
  const proc = Bun.spawn(
    [
      'convert',
      '-density',
      '150x150',
      inputPath,
      '-quality',
      '100',
      '+profile',
      '*',
      '-colorspace',
      'GRAY',
      '-threshold',
      '50%',
      '-append',
      outputPath
    ],
    { stderr: 'pipe' }
  )

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const errText = await new Response(proc.stderr).text()
    throw new Error(`ImageMagick convert failed (exit ${exitCode}): ${errText}`)
  }
}
