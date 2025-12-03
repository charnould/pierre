import { JSX } from 'react/jsx-runtime'
import { Navigation } from './navigation'

/**
 * Renders an error page indicating that the current page is not supported.
 *
 * Displays a friendly error message with a sad emoticon and invites users to
 * suggest new features via email.
 *
 * @param props - Component props
 * @param props.settings - Application settings object
 * @param props.setSettings - Function to update application settings
 * @param props.view - Current view state
 * @param props.setView - Function to update the view state
 * @returns A JSX element containing the navigation and error message
 */
export function UnsupportedPage(
  props: JSX.IntrinsicAttributes & {
    settings: any
    setSettings: any
    view: any
    setView: any
  }
) {
  return (
    <>
      <Navigation {...props} />

      <p className="view__title">(ó﹏ò｡)</p>
      <p className="view__description">Je ne peux rien faire sur cette page.</p>
      <p className="view__description">
        Des idées originales d'interactions ? <br />
        Un email à charnould@pierre-ia.org
      </p>
    </>
  )
}
