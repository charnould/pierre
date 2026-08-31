import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/shared/components/ui/card'
import { useDatastoreTables } from '@/shared/hooks/useDatastoreTables'

interface Props {
  url?: string
}

export function AboutDatastoreTables({ url }: Props) {
  const { tables } = useDatastoreTables(url)

  if (!url?.trim()) return null

  const sorted = tables
    ? [...tables].sort((a, b) => {
        if (a.exists !== b.exists) return a.exists ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    : []

  if (sorted.length === 0) return null

  return (
    <Card size="sm" className="w-full max-w-sm border">
      <CardHeader>
        <CardTitle>Données disponibles</CardTitle>
        <CardDescription>
          Les synthèses reflètent les données mises à disposition et peuvent donc être incomplètes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul aria-label="Tables de données importées" className="flex min-w-0 flex-col">
          {sorted.map(({ name, exists }) => (
            <li key={name} className="flex h-8 min-w-0 items-center justify-between gap-2">
              <span className="truncate text-[0.8125rem] leading-[1.125rem] tabular-nums">
                {name}
              </span>
              {exists ? (
                <span className="sr-only">disponible</span>
              ) : (
                <span className="pierre-meta">absente</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
