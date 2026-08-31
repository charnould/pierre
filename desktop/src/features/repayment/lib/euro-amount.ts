/**
 * Arithmétique des soldes en euros.
 *
 * Les montants sont des flottants : cumuler 199,09 € puis 645,97 € puis
 * −845,06 € laisse 1,14e-13 au lieu de 0. Ce résidu suffit à ce qu'un épisode
 * de dette pourtant soldé ne se referme jamais et que l'âge de la dette
 * continue de croître. On arrondit donc au centime à chaque cumul, et on
 * compare à zéro avec une tolérance d'un demi-centime.
 */

/**
 * Tolérance de comparaison à zéro : un demi-centime.
 *
 * C'est la moitié du plus petit montant réellement représentable en euros, donc
 * aucune dette d'un centime ne peut être prise pour un solde nul. À l'opposé,
 * la dérive flottante d'un grand livre de 240 mouvements reste de l'ordre de
 * 1e-8 centime, soit sept ordres de grandeur sous le seuil.
 */
const DEMI_CENTIME = 0.005

/** Arrondit un montant en euros au centime. Ramène aussi `-0` à `0`. */
export function roundToCents(amount: number): number {
  const rounded = Math.round(amount * 100) / 100
  return rounded === 0 ? 0 : rounded
}

/**
 * Un solde en euros est considéré soldé sous le demi-centime.
 *
 * Comparaison volontairement unilatérale : un solde créditeur (le locataire a
 * trop versé) est soldé, comme le faisait le `<= 0` d'origine.
 */
export function isSettledBalance(balance: number): boolean {
  return balance < DEMI_CENTIME
}
