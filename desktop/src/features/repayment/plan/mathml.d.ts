export {}

type MathMLProps = React.HTMLAttributes<MathMLElement> & {
  display?: 'block' | 'inline'
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      math: React.DetailedHTMLProps<MathMLProps, MathMLElement>
      mfrac: React.DetailedHTMLProps<MathMLProps, MathMLElement>
      mo: React.DetailedHTMLProps<MathMLProps, MathMLElement>
      mrow: React.DetailedHTMLProps<MathMLProps, MathMLElement>
      mtext: React.DetailedHTMLProps<MathMLProps, MathMLElement>
    }
  }
}
