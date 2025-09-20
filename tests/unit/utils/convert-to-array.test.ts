import { describe, expect, it } from 'bun:test'
import { convert_to_array } from '../../../utils/convert-to-array'

describe('convert_to_array', () => {
  it('should convert text into an array of trimmed strings', () => {
    const input = '  hello  |  world  |  '
    const expected = ['hello', 'world']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should remove empty strings from the result', () => {
    const input = '  hello  ||  world  |  '
    const expected = ['hello', 'world']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with newline characters', () => {
    const input = '  hello\n  |  world\n  |  '
    const expected = ['hello', 'world']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should return an empty array for an empty input string', () => {
    const input = ''
    const expected = [] as any
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with multiple consecutive delimiters', () => {
    const input = '  hello  |||  world  |  '
    const expected = ['hello', 'world']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with only delimiters', () => {
    const input = '|||'
    const expected = [] as any
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with no delimiter', () => {
    const input = 'hello'
    const expected = ['hello']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with <think>test</think> at the start', () => {
    const input = '<think>test</think>hello'
    const expected = ['hello']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with <think>test</think> at the end', () => {
    const input = 'hello <think>test</think>'
    const expected = ['hello']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with <think></think> at the end', () => {
    const input = 'hello <think></think>'
    const expected = ['hello']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with <think></think> at the start', () => {
    const input = '<think></think>hello'
    const expected = ['hello']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text escaped characters', () => {
    const input = `<think> </think> En cas de coupure d’électricité dans les parties communes de l’îlot Franche-Comté à Paris 19e, il convient de contacter au plus vite le syndic de l’immeuble ou le gestionnaire du réseau d’électricité ERDF (renommé Enedis). Le syndic aura la charge de déclencher les actions nécessaires, comme l’intervention d’un électricien agréé en cas de problème technique, et pourra aussi faire une réclamation officielle en précisant la date, l’heure et la durée de la panne. Les résidents peuvent également signaler l’incident pour suivre l’évolution via le site ou le service client d’Enedis. | Si la coupure s’éternise, le syndic peut demander des éclairages sur les mesures de reprise urgence, l’impact éventuel sur les systèmes d’alerte ou d’incendie, et les garanties de réparation par la société exploitante, notamment pour les parties communes. | Que faire si la coupure d’électricité rend inutilisables les systèmes d’incendie ou les portes de l’immeuble ? | Doit-on obtenir un certificat d’interruption d’électricité pour solliciter un remboursement ou une compensation ? | "panne électricité îlot Franche-Comté Paris 19e procedure syndic" | "coupure d'électricité parties communes demander compensation"`
    const expected = [
      'En cas de coupure d’électricité dans les parties communes de l’îlot Franche-Comté à Paris 19e, il convient de contacter au plus vite le syndic de l’immeuble ou le gestionnaire du réseau d’électricité ERDF (renommé Enedis). Le syndic aura la charge de déclencher les actions nécessaires, comme l’intervention d’un électricien agréé en cas de problème technique, et pourra aussi faire une réclamation officielle en précisant la date, l’heure et la durée de la panne. Les résidents peuvent également signaler l’incident pour suivre l’évolution via le site ou le service client d’Enedis.',
      'Si la coupure s’éternise, le syndic peut demander des éclairages sur les mesures de reprise urgence, l’impact éventuel sur les systèmes d’alerte ou d’incendie, et les garanties de réparation par la société exploitante, notamment pour les parties communes.',
      'Que faire si la coupure d’électricité rend inutilisables les systèmes d’incendie ou les portes de l’immeuble ?',
      'Doit-on obtenir un certificat d’interruption d’électricité pour solliciter un remboursement ou une compensation ?',
      'panne électricité îlot Franche-Comté Paris 19e procedure syndic',
      "coupure d'électricité parties communes demander compensation"
    ]
    expect(convert_to_array(input)).toEqual(expected)
  })
})
