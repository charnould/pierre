import { html } from 'hono/html'

export const view = () => {
  return html`<p
    class="max-w-[490px] rounded border border-red-300 bg-red-50 !p-2 !text-xs !leading-4 text-red-600"
  >
    Une erreur s'est produite chez le fournisseur de modèle de langage.
    <span
      id="regenerate_answer"
      class="cursor-pointer font-semibold underline decoration-solid decoration-1 underline-offset-2"
      >Cliquer pour regénérer une réponse</span
    >. Si le problème persiste, patienter quelques minutes.
  </p>`
}
