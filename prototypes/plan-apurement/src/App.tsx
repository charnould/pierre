import { FileDown, Info, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  DatePicker,
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui'

const STAGES = [
  ['amiable', 'Recouvrement amiable'],
  ['cdp', 'Commandement de payer'],
  ['assignation', 'Assignation au tribunal'],
  ['audience', 'Audience au tribunal'],
  ['delibere', 'Décision en attente'],
  ['jugement', 'Décision du juge rendue'],
  ['signification', 'Décision de justice signifiée'],
  ['cql', 'Commandement de quitter les lieux']
] as const

const JOBS = [
  'Salarié en CDI',
  'Salarié en CDI (période d’essai)',
  'Salarié en CDD',
  'Salarié en CDD (période d’essai)',
  'Intérimaire',
  'Indépendant / Auto-entrepreneur',
  'Chef d’entreprise',
  'Fonctionnaire / Agent public',
  'Sans emploi',
  'Étudiant',
  'Retraité',
  'Sans activité professionnelle',
  'Autre'
]

const INCOME = [
  [
    'Ressources d’activité',
    [
      'Salaire(s) net(s)',
      'Revenus d’activité indépendante',
      'Indemnités journalières',
      'ARE / Allocation chômage'
    ]
  ],
  [
    'Prestations sociales',
    [
      'AAH',
      'RSA',
      'Prime d’activité',
      'Prestations familiales',
      'APL / ALF / ALS (direct locataire)',
      'APL / ALF / ALS (tiers payant)',
      'Bourse d’études'
    ]
  ],
  [
    'Pensions / rentes',
    [
      'Pension d’invalidité',
      'Pension de retraite',
      'Rente d’accident du travail / maladie professionnelle',
      'Pensions alimentaires reçues'
    ]
  ],
  ['Autres revenus', ['Revenus fonciers', 'Autres revenus réguliers']]
] as const

const PUNCTUAL = [
  'Prime exceptionnelle',
  'Rappel de salaire',
  'Rappel de prestations sociales',
  'Indemnité de licenciement',
  'Indemnité de rupture conventionnelle',
  'Aide financière ponctuelle',
  'Don familial',
  'Succession et héritage',
  'Produit de la vente d’un bien',
  'Autre ressource ponctuelle'
]

const EXPENSES = [
  'Crédit en cours',
  'Assurance habitation',
  'Mutuelle santé',
  'Energie (électricité, gaz, autre)',
  'Eau',
  'Téléphonie, télévision et internet',
  'Transport et essence',
  'Garde / scolarité',
  'Pensions alimentaires versées',
  'Dépenses du quotidien',
  'Abonnements'
]

const PEOPLE = ['Foyer (non assigné)', 'Camille Martin', 'Louis Martin'] as const

const SCHEDULE = [
  [
    '1/6',
    '01/01/2027',
    '800',
    '1 850 €',
    '1 450 + 400',
    '690 €',
    '690 + 0',
    '1,3',
    '9,23 €',
    '80,5 %',
    true,
    '16,15 €',
    '65,9 %',
    false
  ],
  [
    '2/6',
    '01/02/2027',
    '400',
    '1 800 €',
    '1 800 + 0',
    '520 €',
    '520 + 0',
    '1,3',
    '22,56 €',
    '51,1 %',
    false,
    '25,13 €',
    '45,6 %',
    false
  ],
  [
    '3/6',
    '01/03/2027',
    '400',
    '1 800 €',
    '',
    '520 €',
    '',
    '1,3',
    '22,56 €',
    '51,1 %',
    false,
    '25,13 €',
    '45,6 %',
    false
  ],
  [
    '4/6',
    '01/04/2027',
    '400',
    '1 800 €',
    '',
    '520 €',
    '',
    '1,3',
    '22,56 €',
    '51,1 %',
    false,
    '25,13 €',
    '45,6 %',
    false
  ],
  [
    '5/6',
    '01/05/2027',
    '400',
    '1 800 €',
    '',
    '520 €',
    '',
    '1,3',
    '22,56 €',
    '51,1 %',
    false,
    '25,13 €',
    '45,6 %',
    false
  ],
  [
    '6/6',
    '01/06/2027',
    '400',
    '1 800 €',
    '',
    '520 €',
    '',
    '1,3',
    '22,56 €',
    '51,1 %',
    false,
    '25,13 €',
    '45,6 %',
    false
  ]
] as const

function Money({
  id,
  label,
  value,
  labelledBy
}: {
  id: string
  label?: string
  value: string
  labelledBy?: string
}) {
  return (
    <InputGroup className="w-32 tabular-nums">
      <InputGroupInput id={id} defaultValue={value} inputMode="decimal" aria-label={labelledBy} />
      <InputGroupAddon align="inline-end">€</InputGroupAddon>
      {label ? <span className="sr-only">{label}</span> : null}
    </InputGroup>
  )
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function Segment({
  label,
  hint,
  value,
  onChange,
  options,
  hideLabel = false
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  hideLabel?: boolean
}) {
  return (
    <Field className="w-auto">
      {hideLabel && !hint ? null : (
        <div className="flex flex-col gap-1">
          <FieldLabel className={hideLabel ? 'sr-only' : undefined}>{label}</FieldLabel>
          {hint ? <FieldDescription>{hint}</FieldDescription> : null}
        </div>
      )}
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(text(next))}
        aria-label={label}
        className="bg-muted inline-flex h-9 w-fit items-center rounded-lg p-1"
      >
        {options.map((option) => (
          <label
            key={option.value || 'unset'}
            className="text-muted-foreground focus-within:ring-ring/30 has-data-checked:bg-field has-data-checked:text-foreground inline-flex h-7 cursor-pointer items-center rounded-sm px-3 text-sm font-medium focus-within:ring-2 has-data-checked:shadow-sm"
          >
            <RadioGroupItem value={option.value} className="sr-only" />
            {option.label}
          </label>
        ))}
      </RadioGroup>
    </Field>
  )
}

const YES_NO = [
  { value: 'yes', label: 'Oui' },
  { value: 'no', label: 'Non' }
]

function Panel({ children }: { children: ReactNode }) {
  return <div className="border-border rounded-xl border px-8 py-8">{children}</div>
}

function SectionTitle({ children, className }: { children: string; className?: string }) {
  return <FieldLegend className={className}>{children}</FieldLegend>
}

function Chapter({ children, className }: { children: string; className?: string }) {
  return (
    <h3
      className={['font-serif text-xl leading-7 font-semibold tracking-tight', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </h3>
  )
}

function Subhead({ children }: { children: string }) {
  return <h4 className="font-sans text-base leading-6 font-semibold tracking-tight">{children}</h4>
}

const STAGE_DATE: Record<string, string> = {
  amiable: 'Date du recouvrement amiable',
  cdp: 'Date du commandement de payer',
  assignation: 'Date de l’assignation au tribunal',
  audience: 'Date de l’audience au tribunal',
  delibere: 'Date de l’entrée en attente de décision',
  jugement: 'Date de la décision du juge',
  signification: 'Date de la signification',
  cql: 'Date du commandement de quitter les lieux'
}

function labels(options: readonly string[]) {
  return Object.fromEntries(options.map((item) => [item, item]))
}

function Hint({ term, children }: { term: string; children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`Définition de ${term}`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/30 inline-flex outline-none focus-visible:ring-2"
      >
        <Info className="size-3" />
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}

function Signal({ alert, children }: { alert: boolean; children: string }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-1 tabular-nums ${alert ? 'bg-alert' : 'bg-muted'}`}
    >
      {children}
    </span>
  )
}

function Figure({ value, alert, detail }: { value: string; alert?: boolean; detail?: string }) {
  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap tabular-nums">
      <div className={alert ? 'text-destructive' : undefined}>{value}</div>
      {detail ? <div className="text-muted-foreground text-xs">{detail}</div> : null}
    </div>
  )
}

export function App() {
  const [plan, setPlan] = useState('plan')
  const [stage, setStage] = useState('cdp')
  const [visited, setVisited] = useState('yes')
  const [social, setSocial] = useState('yes')
  const [bdf, setBdf] = useState('moratorium')
  const [lease, setLease] = useState('yes')
  const [occupant, setOccupant] = useState('yes')
  const [amendment, setAmendment] = useState('no')
  const [dependent, setDependent] = useState('yes')
  const [dates, setDates] = useState({
    firstMissed: '2026-03-01',
    stage: '2026-06-12',
    ccapex: '2026-07-02',
    ctesi: '',
    socialLast: '2026-09-15',
    moratorium: '2026-12-31',
    birth: '1988-02-14',
    notice: '',
    childBirth: '2016-05-03',
    punMonth: '2027-01-01',
    creditEnd: '2028-06-01',
    pexMonth: '2027-02-01',
    e0: '2027-01-01',
    e1: '2027-02-01',
    e2: '2027-03-01',
    e3: '2027-04-01',
    e4: '2027-05-01',
    e5: '2027-06-01'
  })
  const setDate = (key: keyof typeof dates) => (value: string) =>
    setDates((current) => ({ ...current, [key]: value }))

  return (
    <main className="mx-auto my-8 flex w-full max-w-[78rem] flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#impayes">Impayés</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#martin">Camille Martin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Plan d’apurement</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Panel>
        <FieldSet>
          <SectionTitle>Document</SectionTitle>
          <Segment
            label="Document"
            hideLabel
            value={plan}
            onChange={setPlan}
            options={[
              { value: 'plan', label: 'Plan d’apurement' },
              { value: 'protocol', label: 'Protocole de cohésion sociale' }
            ]}
          />
          <div className="flex flex-nowrap items-end gap-x-3">
            <Field className="w-44 shrink-0">
              <FieldLabel htmlFor="id-loc">Id locataire</FieldLabel>
              <Input id="id-loc" defaultValue="LOC-2281" className="tabular-nums" />
            </Field>
            <Field className="w-44 shrink-0">
              <FieldLabel htmlFor="id-client">Id client</FieldLabel>
              <Input id="id-client" defaultValue="CLI-904" className="tabular-nums" />
            </Field>
            <Field className="w-52 shrink-0">
              <FieldLabel htmlFor="lot">Identifiant du patrimoine</FieldLabel>
              <Input id="lot" defaultValue="PLT-10482" className="tabular-nums" />
            </Field>
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor="address">Adresse du logement</FieldLabel>
              <Input id="address" defaultValue="12 rue des Lilas" />
            </Field>
            <Field className="w-28 shrink-0">
              <FieldLabel htmlFor="postal">Code postal</FieldLabel>
              <Input
                id="postal"
                defaultValue="54000"
                inputMode="numeric"
                className="tabular-nums"
              />
            </Field>
            <Field className="w-44 shrink-0">
              <FieldLabel htmlFor="city">Ville</FieldLabel>
              <Input id="city" defaultValue="Nancy" />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            <Field className="w-auto">
              <FieldLabel htmlFor="debt">Dette locative</FieldLabel>
              <InputGroup className="w-32 tabular-nums">
                <InputGroupInput id="debt" defaultValue="3 600" inputMode="decimal" />
                <InputGroupAddon align="inline-end">€</InputGroupAddon>
              </InputGroup>
            </Field>
            <Field className="w-40">
              <FieldLabel htmlFor="first-missed">Date du premier impayé</FieldLabel>
              <DatePicker
                id="first-missed"
                value={dates.firstMissed}
                onChange={setDate('firstMissed')}
                className="w-40"
              />
            </Field>
          </div>

          <Chapter className="mt-12">Procédure</Chapter>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            <Field className="w-64">
              <FieldLabel htmlFor="stage">Stade actuel de la procédure</FieldLabel>
              <Select
                value={stage}
                onValueChange={(value) => setStage(text(value))}
                items={Object.fromEntries(STAGES)}
              >
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="w-auto">
              <FieldLabel htmlFor="stage-date">{STAGE_DATE[stage] ?? 'Date du stade'}</FieldLabel>
              <DatePicker
                id="stage-date"
                value={dates.stage}
                onChange={setDate('stage')}
                className="w-44"
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            <Field className="w-64">
              <FieldLabel htmlFor="bdf">Situation Banque de France</FieldLabel>
              <Select
                value={bdf}
                onValueChange={(value) => setBdf(text(value))}
                items={{
                  none: 'Aucune procédure',
                  pending: 'Dossier recevable en cours d’instruction',
                  imposed: 'Plan ou mesures imposés',
                  prp: 'Plan de redressement personnel (PRP)',
                  moratorium: 'Moratoire'
                }}
              >
                <SelectTrigger id="bdf">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune procédure</SelectItem>
                  <SelectItem value="pending">Dossier recevable en cours d’instruction</SelectItem>
                  <SelectItem value="imposed">Plan ou mesures imposés</SelectItem>
                  <SelectItem value="prp">Plan de redressement personnel (PRP)</SelectItem>
                  <SelectItem value="moratorium">Moratoire</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {bdf === 'moratorium' ? (
              <Field className="w-44">
                <FieldLabel htmlFor="moratorium">Date de fin du moratoire</FieldLabel>
                <DatePicker
                  id="moratorium"
                  value={dates.moratorium}
                  onChange={setDate('moratorium')}
                  className="w-40"
                />
              </Field>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <Field className="w-auto max-w-sm">
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="ccapex">Date de saisine CCAPEX</FieldLabel>
                <FieldDescription>
                  Commission de coordination des actions de prévention des expulsions
                </FieldDescription>
              </div>
              <DatePicker
                id="ccapex"
                value={dates.ccapex}
                onChange={setDate('ccapex')}
                className="w-44"
              />
            </Field>
            <Field className="w-auto max-w-sm">
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="ctesi">Date de saisine CTESI</FieldLabel>
                <FieldDescription>
                  Commission technique d’examens de situations individuelles
                </FieldDescription>
              </div>
              <DatePicker
                id="ctesi"
                value={dates.ctesi}
                onChange={setDate('ctesi')}
                className="w-44"
              />
            </Field>
          </div>

          <Chapter className="mt-12">Suivi</Chapter>
          <Segment
            label="Rencontre au domicile"
            value={visited}
            onChange={setVisited}
            options={YES_NO}
          />
          <Segment
            label="Travailleur social référent"
            value={social}
            onChange={setSocial}
            options={YES_NO}
          />
          {social === 'yes' ? (
            <div className="border-border flex flex-wrap items-end gap-x-3 gap-y-3 border-l pl-4">
              <Field className="w-44">
                <FieldLabel htmlFor="social-name">Nom</FieldLabel>
                <Input id="social-name" defaultValue="Nadia Bernard" />
              </Field>
              <Field className="w-64">
                <FieldLabel htmlFor="social-org">Structure</FieldLabel>
                <Input id="social-org" defaultValue="Conseil départemental 54" />
              </Field>
              <Field className="w-52">
                <FieldLabel htmlFor="social-contact">Coordonnées</FieldLabel>
                <Input
                  id="social-contact"
                  defaultValue="03 83 00 00 00"
                  placeholder="courriel ou téléphone"
                />
              </Field>
              <Field className="w-44">
                <FieldLabel htmlFor="social-last">Dernier contact du bailleur</FieldLabel>
                <DatePicker
                  id="social-last"
                  value={dates.socialLast}
                  onChange={setDate('socialLast')}
                  className="w-40"
                />
              </Field>
            </div>
          ) : null}
        </FieldSet>
      </Panel>

      <Panel>
        <FieldSet>
          <SectionTitle>Foyer</SectionTitle>
          <div className="flex items-baseline justify-between gap-4">
            <Chapter>Adultes</Chapter>
            <Button variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          <div className="flex flex-nowrap items-end gap-2">
            <Field className="w-[7.25rem] shrink-0">
              <FieldLabel htmlFor="a-first">Prénom</FieldLabel>
              <Input id="a-first" defaultValue="Camille" />
            </Field>
            <Field className="w-[7.25rem] shrink-0">
              <FieldLabel htmlFor="a-last">Nom</FieldLabel>
              <Input id="a-last" defaultValue="Martin" />
            </Field>
            <Field className="w-auto shrink-0">
              <FieldLabel htmlFor="a-birth">Naissance</FieldLabel>
              <DatePicker
                id="a-birth"
                value={dates.birth}
                onChange={setDate('birth')}
                className="w-[9.5rem]"
              />
            </Field>
            <Field className="w-44 shrink-0">
              <FieldLabel htmlFor="a-job">Statut</FieldLabel>
              <Select defaultValue="Salarié en CDI" items={labels(JOBS)}>
                <SelectTrigger id="a-job">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOBS.map((job) => (
                    <SelectItem key={job} value={job}>
                      {job}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="w-40 shrink-0">
              <FieldLabel htmlFor="a-employer">Employeur</FieldLabel>
              <Input id="a-employer" defaultValue="Mairie de Nancy" />
            </Field>
            <Field className="w-28 shrink-0">
              <FieldLabel htmlFor="a-caf">N° CAF</FieldLabel>
              <Input id="a-caf" defaultValue="1234567" className="tabular-nums" />
            </Field>
            <Segment label="Titulaire" value={lease} onChange={setLease} options={YES_NO} />
            <Segment label="Occupant" value={occupant} onChange={setOccupant} options={YES_NO} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Retirer Camille Martin"
              className="shrink-0"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <Segment
              label="Avenant signé"
              hint="Dans Aravis"
              value={amendment}
              onChange={setAmendment}
              options={YES_NO}
            />
            <Field className="w-44">
              <FieldLabel htmlFor="notice">Date de dépôt du préavis</FieldLabel>
              <DatePicker
                id="notice"
                value={dates.notice}
                onChange={setDate('notice')}
                className="w-44"
              />
            </Field>
          </div>

          <div className="mt-12 flex items-baseline justify-between gap-4">
            <Chapter>Enfants</Chapter>
            <Button variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          <div className="flex flex-nowrap items-end gap-2">
            <Field className="w-[7.25rem] shrink-0">
              <FieldLabel htmlFor="c-first">Prénom</FieldLabel>
              <Input id="c-first" defaultValue="Louis" />
            </Field>
            <Field className="w-[7.25rem] shrink-0">
              <FieldLabel htmlFor="c-last">Nom</FieldLabel>
              <Input id="c-last" defaultValue="Martin" />
            </Field>
            <Field className="w-auto shrink-0">
              <FieldLabel htmlFor="c-birth">Naissance</FieldLabel>
              <DatePicker
                id="c-birth"
                value={dates.childBirth}
                onChange={setDate('childBirth')}
                className="w-[9.5rem]"
              />
            </Field>
            <Segment label="À charge" value={dependent} onChange={setDependent} options={YES_NO} />
            <Button variant="ghost" size="icon" aria-label="Retirer Louis Martin">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </FieldSet>
      </Panel>

      <Panel>
        <FieldSet>
          <SectionTitle>Budget du foyer</SectionTitle>
          <Chapter>Ressource</Chapter>
          <div className="-mt-2 flex items-baseline justify-between gap-4">
            <Subhead>Mensuelles</Subhead>
            <Button variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Personne</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Select
                    defaultValue="Salaire(s) net(s)"
                    items={labels(INCOME.flatMap(([, items]) => items))}
                  >
                    <SelectTrigger aria-label="Type de ressource" className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME.map(([group, items]) => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {items.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select defaultValue="Camille Martin" items={labels(PEOPLE)}>
                    <SelectTrigger aria-label="Personne" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PEOPLE.map((person) => (
                        <SelectItem key={person} value={person}>
                          {person}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Money id="inc-amount" value="1 450" labelledBy="Montant de la ressource" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Retirer Salaire(s) net(s)">
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="mt-8 flex items-baseline justify-between gap-4">
            <Subhead>Ponctuelles</Subhead>
            <Button variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Personne</TableHead>
                <TableHead>Mois</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Select defaultValue="Prime exceptionnelle" items={labels(PUNCTUAL)}>
                    <SelectTrigger aria-label="Type de ressource ponctuelle" className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUNCTUAL.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select defaultValue="Foyer (non assigné)" items={labels(PEOPLE)}>
                    <SelectTrigger aria-label="Personne" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PEOPLE.map((person) => (
                        <SelectItem key={person} value={person}>
                          {person}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <DatePicker
                    value={dates.punMonth}
                    onChange={setDate('punMonth')}
                    month
                    aria-label="Mois"
                    className="w-36"
                  />
                </TableCell>
                <TableCell>
                  <Money id="pun-amount" value="400" labelledBy="Montant ponctuel" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Retirer Prime exceptionnelle">
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Chapter className="mt-12">Charge</Chapter>
          <div className="-mt-2 flex items-baseline justify-between gap-4">
            <Subhead>Mensuelles</Subhead>
            <Button variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Fin du crédit</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">Loyer + Charges - Aide au logement</div>
                    <FieldDescription>Montant seul modifiable</FieldDescription>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell>
                  <Money id="rent" value="420" labelledBy="Montant du loyer" />
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>
                  <Select defaultValue="Crédit en cours" items={labels(EXPENSES)}>
                    <SelectTrigger aria-label="Type de charge" className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <DatePicker
                    value={dates.creditEnd}
                    onChange={setDate('creditEnd')}
                    month
                    aria-label="Fin du crédit"
                    className="w-36"
                  />
                </TableCell>
                <TableCell>
                  <Money id="credit" value="180" labelledBy="Montant du crédit" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Retirer Crédit en cours">
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Select defaultValue="Energie (électricité, gaz, autre)" items={labels(EXPENSES)}>
                    <SelectTrigger aria-label="Type de charge" className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell>
                  <Money id="energy" value="90" labelledBy="Montant énergie" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Retirer Energie">
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="mt-8 flex items-baseline justify-between gap-4">
            <Subhead>Ponctuelles</Subhead>
            <Button variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Mois</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Select defaultValue="Dépenses du quotidien" items={labels(EXPENSES)}>
                    <SelectTrigger aria-label="Type de charge ponctuelle" className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <DatePicker
                    value={dates.pexMonth}
                    onChange={setDate('pexMonth')}
                    month
                    aria-label="Mois"
                    className="w-36"
                  />
                </TableCell>
                <TableCell>
                  <Money id="pex" value="100" labelledBy="Montant de la charge ponctuelle" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Retirer Dépenses du quotidien">
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </FieldSet>
      </Panel>

      <Panel>
        <FieldSet>
          <div className="flex items-baseline justify-between gap-4">
            <SectionTitle className="mb-0 w-auto">Aides</SectionTitle>
            <Button variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Select
                    defaultValue="FSL"
                    items={labels([
                      'FSL',
                      'Action Logement',
                      'Secours catholique',
                      'Ligue contre le cancer'
                    ])}
                  >
                    <SelectTrigger aria-label="Type d’aide" className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'FSL',
                        'Action Logement',
                        'Secours catholique',
                        'Ligue contre le cancer'
                      ].map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue="Demandée"
                    items={labels(['À solliciter', 'Demandée', 'Accordée', 'Refusée'])}
                  >
                    <SelectTrigger aria-label="État de l’aide" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['À solliciter', 'Demandée', 'Accordée', 'Refusée'].map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Money id="aid" value="500" labelledBy="Montant de l’aide" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Retirer FSL">
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </FieldSet>
      </Panel>

      <Panel>
        <FieldSet>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <SectionTitle className="mb-1 w-auto">Échéancier</SectionTitle>
              <FieldDescription>
                Complet : toutes les charges. Simplifié : le loyer net d’aide.
              </FieldDescription>
            </div>
            <Button variant="outline">
              <Plus className="size-4" />
              Ajouter une échéance
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table className="w-full tabular-nums [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_th]:px-3 [&_th]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Mensualité</TableHead>
                  <TableHead>Ressources</TableHead>
                  <TableHead>Charges</TableHead>
                  <TableHead>UC</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      RaV/G
                      <Hint term="RaV/G">
                        Reste à vivre complet. Somme restante par jour et par UC, une fois toutes
                        les charges payées.
                      </Hint>
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      TxE/G
                      <Hint term="TxE/G">
                        Taux d’effort complet. Part des ressources absorbée par toutes les charges.
                      </Hint>
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      RaV/L
                      <Hint term="RaV/L">
                        Reste à vivre simplifié. Somme restante par jour et par UC, une fois le
                        loyer net d’aide payé.
                      </Hint>
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      TxE/L
                      <Hint term="TxE/L">
                        Taux d’effort simplifié. Part des ressources absorbée par le loyer net
                        d’aide.
                      </Hint>
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Retirer</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SCHEDULE.map((row) => {
                  const [
                    n,
                    ,
                    amount,
                    res,
                    resDetail,
                    ch,
                    chDetail,
                    uc,
                    ravC,
                    rateC,
                    alertC,
                    ravS,
                    rateS,
                    alertS
                  ] = row
                  return (
                    <TableRow key={n}>
                      <TableCell className="text-muted-foreground tabular-nums">{n}</TableCell>
                      <TableCell>
                        <DatePicker
                          value={dates[`e${SCHEDULE.indexOf(row)}` as keyof typeof dates]}
                          onChange={setDate(`e${SCHEDULE.indexOf(row)}` as keyof typeof dates)}
                          aria-label={`Date de l’échéance ${n}`}
                          className="w-[9.25rem]"
                        />
                      </TableCell>
                      <TableCell>
                        <Money id={`ech-${n}`} value={amount} labelledBy={`Mensualité ${n}`} />
                      </TableCell>
                      <TableCell>
                        <Figure value={res} detail={resDetail || undefined} />
                      </TableCell>
                      <TableCell>
                        <Figure value={ch} detail={chDetail || undefined} />
                      </TableCell>
                      <TableCell className="tabular-nums">{uc}</TableCell>
                      <TableCell>
                        <Signal alert={alertC}>{ravC}</Signal>
                      </TableCell>
                      <TableCell>
                        <Signal alert={alertC}>{rateC}</Signal>
                      </TableCell>
                      <TableCell>
                        <Signal alert={alertS}>{ravS}</Signal>
                      </TableCell>
                      <TableCell>
                        <Signal alert={alertS}>{rateS}</Signal>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label={`Retirer l’échéance ${n}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </FieldSet>
      </Panel>

      <div className="flex items-center justify-end gap-4">
        <Button variant="outline">
          <FileDown className="size-4" />
          Exporter en .docx
        </Button>
        <Button variant="default">Enregistrer</Button>
      </div>
    </main>
  )
}
