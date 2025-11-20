import { JSX } from 'react/jsx-runtime'
import { Navigation } from './navigation'

export function CantDoAnything(
  props: JSX.IntrinsicAttributes & {
    settings: any
    setSettings: any
    detectedView: any
    setDetectedView: any
  }
) {
  return (
    <>
      {/* <Navigation {...props} /> */}

      <div className="mx-6 pb-4">
        <p className="mb-2 text-5xl/tight font-semibold">(ó﹏ò｡)</p>
        <p className="mb-2 text-2xl/tight font-medium">
          Hmmm… je ne peux pas interagir avec cette page.
        </p>

        <p className="mb-0.5 text-sm font-light">
          Pour le moment, mes capacités n’opèrent que sur des pages définies d’ACG/Aravis™.
        </p>

        <p className="mb-2 text-sm font-light">Rendez-vous sur une page compatible !</p>

        <p className="mb-2 text-sm font-light text-gray-500">
          Des idées pour de nouvelles interactions ? <br />
          Un email à{' '}
          <a href="/" className="underline underline-offset-3">
            charnould@pierre-ia.org
          </a>
        </p>
      </div>
    </>
  )
}
