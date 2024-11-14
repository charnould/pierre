import { expect, test } from 'bun:test'
import { split_sms } from '../../../utils/split-sms'

test('should split outgoing sms', async () => {
  const i1 =
    "Si votre voisin fait trop de bruit, voici les étapes à suivre :\n\nEssayer de résoudre le problème à l'amiable : Parlez directement avec votre voisin pour lui faire part de votre gêne. Vous pouvez demander à une tierce personne de vous accompagner si nécessaire.\n\nVérifiez le règlement intérieur : Consultez le règlement de votre résidence pour voir s'il y a des règles concernant le bruit.\n\nSi le problème persiste :\n   Envoyez une lettre recommandée à votre voisin pour formaliser votre plainte.\n   Rassemblez des preuves (témoignages, pétitions, constats) au cas où vous auriez besoin d'un recours.\n   Vous pouvez également contacter la police ou la gendarmerie si le bruit est excessif, surtout la nuit.\n\nDernier recours : Si aucune solution n'est trouvée, vous pouvez saisir un tribunal pour obtenir réparation.\n\nAttention : Assurez-vous que vos plaintes sont fondées pour éviter des complications."
  const o1 = [
    'Si votre voisin fait trop de bruit, voici les étapes à suivre :',
    "Essayer de résoudre le problème à l'amiable : Parlez directement avec votre voisin pour lui faire part de votre gêne. Vous pouvez demander à une tierce personne de vous accompagner si nécessaire.",
    "Vérifiez le règlement intérieur : Consultez le règlement de votre résidence pour voir s'il y a des règles concernant le bruit.",
    'Si le problème persiste :',
    'Envoyez une lettre recommandée à votre voisin pour formaliser votre plainte.',
    "Rassemblez des preuves (témoignages, pétitions, constats) au cas où vous auriez besoin d'un recours.",
    'Vous pouvez également contacter la police ou la gendarmerie si le bruit est excessif, surtout la nuit.',
    "Dernier recours : Si aucune solution n'est trouvée, vous pouvez saisir un tribunal pour obtenir réparation.",
    'Attention : Assurez-vous que vos plaintes sont fondées pour éviter des complications.'
  ]
  expect(split_sms(i1)).toEqual(o1)

  const i2 = 'Ce SMS est super court.'
  const o2 = ['Ce SMS est super court.']
  expect(split_sms(i2)).toEqual(o2)
})
