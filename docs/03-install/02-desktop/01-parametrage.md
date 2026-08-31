# Application desktop Windows et macOS

TODO: expliquer le paramétrage via customization

PIERRE dispose d'une application desktop (Windows et macOS) [téléchargeable ici](https://github.com/charnould/pierre/releases/latest). Un lien de téléchargement est également disponible depuis la page d'accueil de l'interface d'administration.

> [!NOTE]
> **macOS** — Lors du premier lancement, macOS peut afficher un avertissement de sécurité car l'application n'est pas notarisée par Apple. Si vous voyez le message _"pierre est endommagé et ne peut pas être ouvert"_, exécutez la commande suivante dans le Terminal, puis relancez l'application :
>
> ```bash
> sudo xattr -rd com.apple.quarantine /Applications/pierre.app
> ```
>
> Vous pouvez également faire un clic droit sur l'application > **Ouvrir**, puis confirmer dans la boîte de dialogue, ou aller dans **Réglages système > Confidentialité et sécurité** et cliquer sur **Ouvrir quand même**.

> [!NOTE]
> **Windows** — Lors du premier lancement, Windows SmartScreen peut afficher _"Windows a protégé votre ordinateur"_. Cliquer sur **Informations complémentaires**, puis sur **Exécuter quand même**.
