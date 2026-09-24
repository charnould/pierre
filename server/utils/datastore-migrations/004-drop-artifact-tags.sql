UPDATE prompts
SET body = replace(
  body,
  '- Pas de `<artifact name="output">` ni autre balise XML
',
  ''
)
WHERE id = 'about';

UPDATE prompts
SET body = replace(
  replace(
    replace(
      replace(
        body,
        '- La **sortie finale** ne contient **que** l''objet du courrier et son corps.
- **Le premier caractère de la sortie est `<`** (début de `<artifact name="subject">`). Aucun texte avant.',
        '- La **sortie finale** ne contient **que** l''objet du courrier et son corps. Aucun texte avant.'
      ),
      '- [ ] La sortie commence-t-elle directement par `<artifact name="subject">` ?
',
      ''
    ),
    '**La sortie commence immédiatement par** `<artifact name="subject">`',
    '**La sortie commence immédiatement par le courrier**'
  ),
  '```xml
<artifact name="subject">Votre demande relative au dégât des eaux — dossier n° REQ-2024-00142</artifact>
',
  '```
'
)
WHERE id = 'replies';
