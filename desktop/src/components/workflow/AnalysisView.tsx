export function AnalysisView({ content }: { content: string }) {
  return (
    <pre className="font-ibmplexsans text-[15px] break-words whitespace-pre-wrap text-[#444444]">
      {content}
    </pre>
  )
}
