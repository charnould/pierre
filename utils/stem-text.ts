import natural from 'natural'
import stopwords from 'stopwords-fr'

//
// Stem text
//
export const stem = (chunk: string) => {
  const normalize = (s: string) =>
    s
      .normalize('NFD') // decompose combined characters
      // biome-ignore lint: on going
      .replace(/[\u0300-\u036f]/g, '') // remove accent characters
      .replace(/[ç]/gi, 'c') // special handling for ç
      .toLowerCase() // convert to lowercase
      .replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, ' ')

  const cleaned_chunk = normalize(chunk)
  const tokens = new natural.AggressiveTokenizerFr().tokenize(cleaned_chunk)
  const stem_stopwords = stopwords.map((w: string) => normalize(natural.CarryStemmerFr.stem(w)))
  let stem_chunk = ''

  for (const token of tokens) {
    const stem = natural.CarryStemmerFr.stem(token)
    if (!stem_stopwords.includes(stem)) stem_chunk += `${stem} `
  }

  return stem_chunk.replace(/\s{2,}/g, ' ').trim()
}
