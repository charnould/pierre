import { html } from 'hono/html'
import type { User } from '../utils/_schema'

export const view = (users: User[]) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.12/dist/turbo.es2017-umd.js"></script>
        <link rel="icon" href="../assets/pierre-ia.org/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1739741252036.css" />
        <title>PIERRE — Console</title>
      </head>

      <body class="mt-20 ml-20 w-5xl min-w-5xl bg-stone-50">
        <a href="/a" class="mb-6 block w-fit rounded-full bg-teal-200 px-3 py-1 pr-4 font-medium"
          >← Retour</a
        >

        <h1 class="mb-10 font-mono text-6xl font-extrabold">Utilisateurs</h1>

        <p class="mb-2 max-w-2xl text-sm">
          Un <span class="font-semibold">administrateur</span> peut (a) modifier les utilisateurs,
          (b) modifier l'encyclopédie, (c) consulter les conversations, (d) consulter les
          statistiques et (e) utiliser l'IA. Un <span class="font-semibold">contributeur</span> peut
          uniquement réaliser (b) et (e). Un <span class="font-semibold">collaborateur</span> peut
          uniquement utiliser (e).
        </p>
        <p class="mb-8 max-w-2xl text-sm">
          Si un utilisateur a oublié son mot de passe : supprimez-le et recréez-le.

          <br />Après avoir créé un utilisateur, n'oubliez pas de lui communiquer son mot de passe.
        </p>

        <form method="post" class="mb-8 flex w-fit justify-around gap-x-6">
          <input type="hidden" name="action" value="create_user" />

          <div>
            <label for="email" class="mb-1 block text-sm font-medium text-gray-900">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="charnould@pierre-ia.org"
              required
              class="block w-[200px] rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none"
            />
          </div>

          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-gray-900"
              >Password</label
            >
            <input
              type="text"
              id="password"
              name="password"
              placeholder="SIOnATCHEW"
              required
              class="block w-[120px] rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-700 outline-none"
            />
          </div>

          <div class="mx-auto max-w-sm">
            <label for="role" class="mb-1 block text-sm font-medium text-gray-900">Rôle</label>
            <select
              id="role"
              name="role"
              required
              class="block w-full appearance-none rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none"
            >
              <option value="" selected>Choisir un rôle</option>
              <option value="administrator">Administrateur</option>
              <option value="contributor">Contributeur</option>
              <option value="collaborator">Collaborateur</option>
            </select>
          </div>

          <input
            type="submit"
            value="Ajouter"
            class="mt-6 cursor-pointer rounded-lg bg-blue-600 px-5 py-2 font-medium text-white"
          />
        </form>

        <form method="post">
          <input type="hidden" name="action" value="delete_user" />

          <table>
            ${users.map(
              (user) =>
                html`<tr>
                  <td class="pr-4 align-middle">
                    <button type="submit" name="email" value="${user.email}">
                      <svg
                        class="size-6 cursor-pointer stroke-2 hover:stroke-red-700"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </td>
                  <td class="pr-4 text-left text-xl font-normal text-blue-600">${user.role}</td>
                  <td class="text-left text-xl font-medium">${user.email}</td>
                </tr>`
            )}
          </table>
        </form>
      </body>
    </html>`
}
