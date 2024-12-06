import { expect, test } from 'bun:test'
import { stem } from '../../../utils/stem-text'

test('should stem correctly', async () => {
  expect(stem('qui es tu ?')).toBe('')

  expect(stem("Mon jambon, ! ?  est blessé, et je m'en fous")).toEqual('jambon bles fous')
  expect(stem('qui est Xavier Nicolas')).toEqual('xav nicol')
  expect(
    stem(`Ci-après la description à la fois générale et des éléments techniques et patrimoniaux d'un immeuble Grand Dijon Habitat : 
- secteur
astreinte : Est
- agence de proximite : Agence 5 – Mansart
- n° programme : 229
- n° batiment : 1
- n° allee : 1
- programme : FYOT DE LA MARCHE
- batiment : FYOT DE LA MARCHE
- adresses : 10 rue Fyot de la marche
- communes : DIJON
- nb logements : 2
- type : COLLECTIF GDH / EN VENTE
- mode de gestion si type «aful, asl, copropriete ou propriete en volume» : Sans objet, Gestion GDH
- niveau ou nb de niveaux : R+1
- date mise en gestion aravis : samedi 1 janvier 2005 à 00:00
- mode de production chauffage : INDIVIDUEL PAR CHAUDIERE GAZ
- fournisseur d'energie du reseau de chauffage urbain : Sans objet
- prestataire chaufferie et reseau secondaire immeuble (hors logements) : Sans objet
- prestataire chauffage en logements : PROXISERVE
- numero de chaufferie immeuble ( ou de sous-station de l'immeuble) : Sans objet
- comptage energie thermique, type, localisation : NON
- ventilation couplée chaudières gaz avec dsc (dispositif de sécurité collectif)  : Sans objet
- mode de production / prestataire : INDIVIDUEL PAR CHAUDIERE GAZ PROXISERVE
- solaire : Sans objet
- type vmc : NON
- prestataire vmc : Sans objet
- prestataire location releve compteur eau chaude / situation : Sans objet
- prestataire location releve compteur eau froide / situation : Gestion SDAT
- concessionnaire fourniture principale : ODIVEA
- prestataire entretien robinetterie : CGMI
- prestataire plomberie : PROXISERVE
- prestataire pompe relevage / situation : Sans objet
- prestataire degorgement canalisations (sauf pompes de relevage, voir colonne précédente) avec signature préalable d'un bon d'intervention si logement : Gestion OCCUPANT si privatif, SARP si colonnes communes
- prestataire detartrage colonnes canalisations : SARP
- prestataire ascenseurs : Sans objet
- numero ascenseurs / situation : Sans objet
- prestataire pag : Sans objet
- situation, modele, n° pag et n° emetteur : Sans objet
- prestataire desenfumage naturel ou mecanique des communs : Sans objet
- prestataire extincteurs communs (hors chaufferies) : Sans objet
- prestataire colonnes seches : Sans objet
- prestataire blocs automomes d'eclairage de securite (baes) : Sans objet
- tele-surveillance patrimoine : NON
- equipement de reception televison : ANTENNES
- fournisseur exterieur reseau cable : Sans objet
- prestataire television parabole : INEO INFRACOM
- immeuble relie fibre optique : OUI
- antenne relai telephonie mobile : Sans objet
- couverture ou etancheite prestataire : COUVERTURE / UTB
- prestataire nettoyage pc int. : Gestion OCCUPANT
- prestataire ordures menageres : Gestion OCCUPANT
- distribution sacs om : Sans objet
- prestataire objets encombrants : ENTRETIEN DIJONNAIS
- prestataire espaces verts : Sans objet
- prestataire aire de jeux : Sans objet
- desinsectisation : LOGISSAIN
- interphonie courant faible : BVS
- electricite courant fort : SANUELEC
- papier peint peinture cloison logt occupé et commun : PNA SERVICES
- papier peint peinture cloison logt vacant : PNA SERVICES
- revetement de sol : BRULE
- nettoyage logt vacant : PROMUT
- menuiserie volet roulant vitrerie : SOLUTIONS MENUISERIE
- qpv ( quartiers politique de la ville) : NON
- secteur proximité aravis : 105056
- charge de proximite : BELRHAZI Abdelmoughit`)
  ).toEqual(
    'descrip general technic patrimonial immeubl grand dijon habi sec astrein ag proxim ag 5 mansar program 229 batim 1 1 program fyot march batim fyot march adr 10 rue fyot march commun dijon nb log 2 type collectiv gdh ven mod ges type aful asl copropr propr volum obje ges gdh niv nb niveal 1 dat mis ges arav samed 1 janv 2005 00 00 mod prod chauff individu chaud gaz fournis energ chauff urbain obje presta chauff second immeubl log obje presta chauff log proxiserv numero chauff immeubl station immeubl obje comp energ thermic type localis ventil coupl chaud gaz dsc dispositiv secur collectiv obje mod prod presta individu chaud gaz proxiserv sol obje type vmc presta vmc obje presta loca relev comp eau chaud situa obje presta loca relev comp eau froid situa ges sdat concession fourni principal odiv presta entre robinet cgmi presta plomb proxiserv presta pomp relev situa obje presta degorg canalis pomp relev colon preced signa interven log ges occup privativ sarp colon commun presta detartr colon canalis sarp presta ascens obje numero ascens situa obje presta pag obje situa model pag eme obje presta desenfum mecanic commun obje presta extinc commun chauff obje presta colon sech obje presta bloc automom eclair secur baes obje surveil patrimoin equip recep televison anten fournis cabl obje presta television parabol ineo infracom immeubl rel fibr optic oui anten rel telephon mobil obje couver etanche presta couver utb presta netto pc in ges occup presta ordur menager ges occup distribu sac om obje presta obje encombr entre dijon presta espac obje presta air jeux obje desinsectis logissain interphon cour faibl bvs electric cour for sanuelec pap pein peintur cloison log occup commun pna servic pap pein peintur cloison log vac pna servic reve sol brul netto log vac promu menuis vole roul vitr solu menuis qpv politic vil sec proxim arav 105056 charg proxim belrhaz abdelmough'
  )
})
