import { expect, it } from 'bun:test'
import { db } from '../../utils/database'
import { score_chunk } from '../../utils/rank-chunks'
import { stem } from '../../utils/stem-text'

//
//
// Tiny helpers used only in this test file.
// Calculate global score
const calculate_score = (scores: {
  building_score: number
  process_score: number
  relevancy_score: number
}) => {
  return scores.building_score + scores.process_score + scores.relevancy_score
}
//
//
//
//
//
//
//
//
// Check if scoring algorithm is correct
it('should reject irrelevant chunk', async () => {
  const data = db('proprietary.private')
    .prepare(
      `
      SELECT
        c.entity_hash,
        c.chunk_hash,
        c.chunk_text,
        s.rank AS distance,
        'private' AS source 
      FROM stems s 
      JOIN chunks c ON s.rowid = c.rowid
      WHERE s.chunk_stem MATCH ?
      ORDER BY distance
      LIMIT 5;
      `
    )
    .all(stem('racine')) as unknown as {
    entity_hash: string
    chunk_hash: string
    chunk_text: string
    distance: number
    source: string
  }[]

  const context = {
    query: {
      standalone_questions: ['quelle procédure pour un ascenseur bloqué à la résidence Racine'],
      named_entities: {
        building: 'racine',
        process: null
      }
    }
  }

  let index = 0
  for await (const d of data) {
    const score = await score_chunk(context, d)
    console.log('\n---------------------------------')
    console.log(d.chunk_text)
    console.log('\n')
    console.log(score)
    if (index === 0) expect(calculate_score(score)).toBeLessThan(1300)
    if (index === 1) expect(calculate_score(score)).toBeLessThan(1300)
    if (index === 2) expect(calculate_score(score)).toBeGreaterThan(900)
    if (index === 3) expect(calculate_score(score)).toBeGreaterThan(900)
    if (index === 4) expect(calculate_score(score)).toBeGreaterThan(900)
    if (index === 5) expect(calculate_score(score)).toBeGreaterThan(900)
    index++
  }
})

//
//
//
//
//
//
//
//
// Check if scoring algorithm is correct
it('should find answer in a super simple chunk', async () => {
  const context = {
    query: {
      standalone_questions: ['Qui a inventé Pierre IA ?'],
      named_entities: {
        building: 'racine',
        process: null
      }
    }
  }

  const chunk = {
    distance: 1,
    source: 'private',
    chunk_hash: 'c_hash',
    entity_hash: 'e_hash',
    chunk_text: 'Le créateur de Beckrel est Charles-Henri, il a aussi créé Pierre IA.'
  }

  const score = await score_chunk(context, chunk)
  console.log('\n---------------------------------')
  console.log(chunk.chunk_text)
  console.log('\n')
  console.log(score)
  expect(score.relevancy_score).toBeGreaterThan(600)
})

//
//
//
//
//
//
//
//
// Check if scoring algorithm is correct
// gpt4-o-mini cannot find the answer, but gpt-4-o can.
it.skip('should find answer in a complex simple chunk', async () => {
  const context = {
    query: {
      standalone_questions: ["Où se trouvent les clefs des portes d'astreintes"],
      named_entities: {
        building: null,
        process: null
      }
    }
  }

  const chunk = {
    distance: 1,
    source: 'private',
    chunk_hash: 'c_hash',
    entity_hash: 'e_hash',
    chunk_text:
      "Ci-après un procédure à l'attention de la société de télésurveillance (Sofratel) et des agents et cadres d'astreinte de Grand Dijon Habitat : \n- thématique : Eau\n- zone : Logement\n- motif de l'appel du locataire à sofratel : FUITE D'EAU IMPORTANTE DANS LOGEMENT AVANT OU APRES COMPTEUR \n- sous-motif de l'appel du locataire à sofratel : L'appel concerne une fuite d'eau importante dans le logement\n- exemples de verbatims : Fort débit et non maitrisable (impossible de fermer la vanne d'arrêt du logement ou logement du dessus vacant ou locataire absent ou logement squatté) \n- degré d’urgence : 2- urgence relative\n- sofratel doit-il appeler l'agent d'astreinte ? : OUI\n- sofratel doit-il envoyer un sms à l'agent ou cadre d'astreinte ? : OUI\n\n24h/24h\n- quelle action doit mener l'agent d'astreinte après le message de sofratel ? : Sortie de l'agent d'astreinte si non locatif après appel locataire pour diagnostic préalable et accord cadre d'astreinte\n- horaires et jours de sortie de l'agent d'astreinte : 7j/7j - 24h/24h\n- actions à mener par sofratel lors de l'échange téléphonique avec le locataire : Demander au locataire si il a bien tenté de fermer complétement la vanne d'arrêt située dans son logement ou sur son palier (il peut s'aider d'une pince si nécéssaire) et consigner sa réponse.\n\nFaire une main courante avec toutes les coordonnées, descriptif et si possible photo/vidéo (les photos permettent d'apprécier l'ampleur et la localisation de la fuite, des endroits innondés ET demander une photo de la vanne d'arrêt (cela permet de s'assurer que le locataire sait où elle se trouve et si elle est bien fermée complétement) + appel agent d'astreinte qui contactera le locataire pour diagnostic approfondi en disposant des photos.\n\n\n- actions à mener par l'agent d'astreinte après le message de sofratel : Avant l'appel du locataire : L'agent d'astreinte regarde dans ARAVIS si le locataire n'a pas déjà contacté GDH pour ce type de problème dans les heures ou jours qui ont précédé. Il regarde également si le locataire concerné n'est pas vulnérable (en situation de handicap, senior, sous curatelle/tutelle).\n\nDans le cas où le logement du dessus est en cause est vacant : l'agent d'astreinte vérifie dans ARAVIS la nature de la vacance, l'éventuelle existence d'un sinistre ou d'une situation déjà connue et s'assure qu'il pourra rentrer dans le logement avant de se rendre sur place et de contacter le cadre d'astreinte (ex porte anti-squat, vacant huissier, vacant travaux...). A noter que si porte anti-squat est posée, le cadre d'astreinte dispose de la clé dans la malette d'astreinte.\n\nLors de l'appel l'agent d'astreinte vérifie les points suivants :\n\nDemander explicitement au locataire si la vanne arrêt du logement a bien été fermée complétement (il doit s'aider d'une pince si besoin). Le locataire doit ouvrir en grand tous ses robinets pour évacuer au maximum l'eau qui reste dans les tuyaux (cela prend quelque secondes). Parfois, il peut tout de même rester de l'eau dans le circuit et cela peut mettre plusieurs heures à s'évacuer (par les plinthes, les cloisons, sous le meuble évier...), le locataire doit alors continuer d'éponger. La situation peut-elle attendre (ou pas) ?\n\n Il communique au cadre d'astreinte son évaluation de la situation. Si le caractère non maitrisable est confirmé, se déplacer sur site après accord du cadre d'astreinte et fermer la vanne de pied de colonne ou la vanne d'arrêt générale du bâtiment. \n\nSi WE et jour férié contacter en journée PROXISERVE Dijon : Xavier Nicolas au 06 10 11 40 32 ou Larry Freitas 06 24 33 59  66. L'intervention de réparation sera à programmer le lendemain en journée. \n\nEn semaine entre 22h et 7h l'intervention de réparation sera gérée le lendemain par l'agence en heures ouvrées. Si l'absence d'eau est prévue pour durer plus de 6h en WE ou jour férié (ex pont) et concerne plusieurs logements proposer des bouteilles d'eau à recupérer dans le garage n°5 du siège (clé dans la malette des agents d'astreinte titulaires).\n- actions à mener par le cadre d'astreinte : Le cadre d'astreinte autorise la sortie de l'agent d'astreinte si l'urgence est confirmée. Si logement vacant au dessus est en cause, le cadre d'astreinte s'assure de savoir si l'agent d'astreinte a bien vérifié qu'il pourra rentrer. En cas de porte anti-squat, la clé est dans la malette d'astreinte et nécéssitera un déplacement sur site).\n\nIl est informé des actions réalisées sur place par l'agent d'astreinte et de la programmation de la réparation  par PROXISERVE le cas échéant.\n\nIl intervient si nécéssaire auprès de PROXISERVE. Si besoin d'aspirer l'eau au sol dans le logement ou les parties communes, la SARP (03 80 68 20 00) dispose d'un aspirateur adapté et peut être mobilisée par l'agent d'astreinte pour intervenir le lendemain.\n\nEn cas de fermeture de la vanne de pied de colonne ou d'arrêt générale du bâtiment, envisager avec le directeur général ou la personne faisant fonction l'envoi d'un SMS aux locataires concernés pour proposer la distribution de bouteilles d'eau. Les bouteilles sont stockées dans le garage n°5 (clé dans la malette d'astreinte des agents titulaires).\n\nSi week-end ou jour férié en présence de l'agent d'astreinte (avec accord cadre d'astreinte) ou de l'agence en semaine"
  }

  const score = await score_chunk(context, chunk)
  console.log('\n---------------------------------')
  console.log(chunk.chunk_text)
  console.log('\n')
  console.log(score)
  expect(calculate_score(score)).toBeGreaterThan(700)
})
