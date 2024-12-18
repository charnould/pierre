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
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1734620244584.css" />
        <title>PIERRE — Administration > Utilisateurs</title>
      </head>

      <body class="mx-20 my-10 w-[690px]">
        <a href="/a" class="font-medium text-blue-700">← Retour</a>

        <h1 class="mt-5 text-6xl font-bold">Utilisateurs</h1>
        <h2 class="mb-10 text-3xl font-medium">Ajouter ou supprimer des utilisateurs</h2>

        <form method="post" class="flex w-fit justify-around gap-x-6">
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

        <ul class="mt-2 mb-10 text-xs">
          <li class="mb-1">
            Un <span class="font-semibold">administrateur</span> peut (a) modifier les utilisateurs,
            (b) modifier la base de connaissance, (c) consulter les conversations, (d) consulter les
            statistiques et (e) utiliser « l'aide de camp ». Un
            <span class="font-semibold">contributeur</span> peut uniquement réaliser (b) et (e). Un
            <span class="font-semibold">collaborateur</span> peut uniquement utiliser (e).
          </li>

          <li class="mb-1">
            Si un collaborateur a oublié son mot de passe : supprimez l'utilisateur et recréez-le.
          </li>

          <li>
            Après avoir créé un utilisateur, n'oubliez pas de lui communiquer son mot de passe.
          </li>
        </ul>

        <form method="post">
          <input type="hidden" name="action" value="delete_user" />

          <table>
            ${users.map(
              (user) =>
                html`<tr>
                  <td class="pr-4 align-middle">
                    <button
                      type="submit"
                      name="email"
                      value="${user.email}"
                      class="cursor-pointer rounded bg-red-50 px-3 text-sm font-normal text-red-600"
                    >
                      Supprimer
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
