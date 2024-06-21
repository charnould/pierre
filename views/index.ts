import { html } from 'hono/html'

export const view = (params) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <link rel="stylesheet" href="../assets/default/style.css" />
        <link rel="stylesheet" href="../assets/${params.config}/style.css" />
        <link rel="manifest" href="../assets/${params.config}/manifest.json" />
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <script defer src="../assets/script.js"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <title>PIERRE — Une IA au service du mouvement HLM</title>
      </head>

      <body>
        <div id="conversation">
          <p data-role="system">${params.greeting}</p>  
          <div class="examples">
            ${params.examples.map((t: string) => html`<p class="tip">${t}</p>`)}
          </div>
        </div>
        
        <div id="ask">
          <div id="input">
          <input name="message" id="prompt" placeholder="Poser une question...">
            <input id="submit" type="button" value="➔" />
          </div>
          <p id="disclaimer">Alpha · L'IA peut se tromper, vérifiez les informations · <a href="/">Reset</a></p>
        </div>
      </body>
    </html>`
}
