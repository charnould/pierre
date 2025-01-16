import { expect, test } from 'bun:test'
import { generate_embeddings } from '../../utils/search-by-vectors'

test('should embed many fast', async () => {
  performance.mark('start')

  await generate_embeddings([
    'Quelles sont les conséquences de la décision de quitter votre logement sur votre situation personnelle et financière ?',
    "Comment cette décision s'inscrit-elle dans vos projets de vie à long terme ?",
    'Quels critères avez-vous pris en compte pour choisir de quitter votre logement actuel ?',
    'Comment la gestion de votre préavis de congé pourrait-elle influencer vos relations avec votre propriétaire ou vos voisins ?',
    'Quelles alternatives avez-vous envisagées avant de décider de déposer votre préavis de congé ?',
    'Quelles sont les raisons qui vous poussent à envisager un préavis de congé ?',
    'Comment pensez-vous que ce congé pourrait affecter votre travail et vos collègues ?',
    'Avez-vous réfléchi aux alternatives possibles à un congé ?',
    "Quels sont les impacts à long terme d'un congé sur votre carrière ?",
    'Comment comptez-vous gérer la transition avant et après votre congé ?',
    'Comment rédiger un préavis de congé pour mon logement ?',
    'Quelles sont les étapes pour déposer un préavis de congé à Paris ?',
    'Délai de préavis de congé pour un appartement en location en Seine-Saint-Denis',
    'Modèle de lettre de préavis de congé pour un logement en location',
    'modèle de courrier préavis de congé',
    'exemple de lettre de préavis de congé',
    'formulaire préavis de congé',
    'conseils pour rédiger un préavis de congé',
    "Pour déposer votre préavis de congé pour votre logement, vous devez rédiger une lettre recommandée avec accusé de réception à l'attention de votre propriétaire. Assurez-vous d'inclure vos coordonnées, l'adresse du logement, et la date de votre départ.",
    "Le délai de préavis dépend de votre type de contrat de location : généralement, il est de trois mois pour une location vide et d'un mois pour une location meublée. Vérifiez également si des dispositions spécifiques s'appliquent dans votre département, comme dans le 75 (Paris).",
    "N'oubliez pas de conserver une copie de votre lettre de préavis et l'accusé de réception comme preuve de votre démarche. Cela peut être utile en cas de litige ultérieur avec votre propriétaire.",
    'Enfin, si vous êtes en situation de mobilité professionnelle ou de mutation, vous pouvez demander une réduction de votre préavis à un mois, même pour une location vide, en fournissant les justificatifs nécessaires.',
    "Pour rédiger un préavis de congé, il est important d'inclure vos coordonnées, la date de l'envoi, et la date de départ souhaitée. Mentionnez également le motif du congé si nécessaire. Assurez-vous d'envoyer le courrier en recommandé avec accusé de réception pour avoir une preuve de votre demande.",
    "Un modèle de courrier pour le préavis de congé doit comporter l'objet, vos informations personnelles, la date, et une formule de politesse. Indiquez clairement la date de départ et, si applicable, le motif de votre départ. N'oubliez pas de signer le document.",
    "Dans votre courrier de préavis de congé, commencez par vos coordonnées et celles du destinataire. Précisez la date de départ et le motif si requis. Il est conseillé d'envoyer ce courrier par recommandé pour garantir sa réception.",
    "Pour un préavis de congé, rédigez un courrier en mentionnant vos coordonnées, la date d'envoi, et la date de départ. Incluez le motif si nécessaire et terminez par une formule de politesse. L'envoi en recommandé est recommandé pour des raisons de preuve.",
    'Comment déposer mon préavis de congé pour mon logement ?',
    'Avez-vous un modèle de courrier pour le préavis de congé ?'
  ])

  performance.mark('end')
  const perf = performance.measure('delay', 'start', 'end').duration
  console.log(`${perf}ms`)

  expect(perf).toBeLessThan(3000)
})
