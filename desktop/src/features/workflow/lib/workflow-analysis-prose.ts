import type { EditorThemeClasses } from 'lexical'

export const artifactProseClassName = 'artifact-lexical-root'

export const artifactLexicalTheme: EditorThemeClasses = {
  paragraph: 'artifact-lexical-paragraph',
  heading: {
    h1: 'artifact-lexical-heading artifact-lexical-heading-h1',
    h2: 'artifact-lexical-heading artifact-lexical-heading-h2',
    h3: 'artifact-lexical-heading artifact-lexical-heading-h3',
    h4: 'artifact-lexical-heading artifact-lexical-heading-h4',
    h5: 'artifact-lexical-heading artifact-lexical-heading-h5',
    h6: 'artifact-lexical-heading artifact-lexical-heading-h6'
  },
  list: {
    ul: 'artifact-lexical-list artifact-lexical-list-ul',
    ol: 'artifact-lexical-list artifact-lexical-list-ol',
    listitem: 'artifact-lexical-listitem'
  },
  text: {
    bold: 'artifact-lexical-text-bold',
    italic: 'artifact-lexical-text-italic'
  }
}
