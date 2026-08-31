import {
  CircleOff,
  FileSearch,
  FileText,
  Handshake,
  Home,
  KeyRound,
  ListChecks,
  PauseCircle,
  Plus,
  RotateCcw,
  Trash2
} from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/shared/components/ui/item'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'

import {
  createAdultMember,
  createAidItem,
  createAmountLine,
  createChildMember
} from '../../lib/apurement-plan/defaults'
import { listHouseholdPeople } from '../../lib/apurement-plan/household'
import {
  buildInstallments,
  clampInstallmentCount,
  firstInstallmentYearMonth,
  updateInstallmentAmount,
  updateInstallmentYearMonth
} from '../../lib/apurement-plan/installments'
import {
  BANQUE_DE_FRANCE_STATUS_LABELS,
  DEFAULT_PLAN_DURATION_MONTHS,
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUS_ORDER,
  EXPENSE_PRESETS,
  INCOME_PRESETS,
  OCCUPANCY_TYPE_LABELS,
  PENSION_FUND_OPTIONS,
  PLAN_TYPE_LABELS,
  buildEmploymentSelectItems,
  decodeEmploymentSelectValue,
  encodeEmploymentSelectValue,
  employmentStatusNeedsPensionFund,
  type AdultMember,
  type AidItem,
  type AmountLine,
  type ApurementPlanFormData,
  type BanqueDeFranceStatus,
  type ChildMember,
  type OccupancyType,
  type PlanType
} from '../../lib/apurement-plan/types'
import { AidList } from './AidList'
import { AmountLineList } from './AmountLineList'
import { BooleanField } from './BooleanField'
import { DatePicker } from './DatePicker'
import { MoneyInput } from './MoneyInput'
import { PlanCalculationsPanel } from './PlanCalculationsPanel'
import { YearMonthInput } from './YearMonthInput'

type FormUpdater = (patch: Partial<ApurementPlanFormData>) => void
type SectionUpdater<T> = (patch: Partial<T>) => void

const EMPLOYMENT_SELECT_ITEMS = buildEmploymentSelectItems()

function EmploymentSelectGroupedItems() {
  return (
    <>
      {EMPLOYMENT_STATUS_ORDER.map((status) => {
        if (!employmentStatusNeedsPensionFund(status)) {
          return (
            <SelectGroup key={status}>
              <SelectItem value={status}>{EMPLOYMENT_STATUS_LABELS[status]}</SelectItem>
            </SelectGroup>
          )
        }
        return (
          <SelectGroup key={status}>
            <SelectLabel>{EMPLOYMENT_STATUS_LABELS[status]}</SelectLabel>
            {PENSION_FUND_OPTIONS.map((fund) => {
              const value = encodeEmploymentSelectValue(status, fund)!
              return (
                <SelectItem key={value} value={value}>
                  {fund}
                </SelectItem>
              )
            })}
          </SelectGroup>
        )
      })}
    </>
  )
}

function PlanSection({
  title,
  description,
  action,
  children
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <FieldSet>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <FieldLegend variant="legend">{title}</FieldLegend>
          <FieldDescription>{description}</FieldDescription>
        </div>
        {action}
      </div>
      <FieldGroup>{children}</FieldGroup>
    </FieldSet>
  )
}

function MoneyField({
  id,
  label,
  description,
  value,
  onChange
}: {
  id?: string
  label: string
  description?: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <MoneyInput id={id} value={value} onChange={onChange} />
    </Field>
  )
}

function ChoiceCards<T extends string>({
  label,
  description,
  value,
  options,
  onChange
}: {
  label: string
  description: string
  value: T
  options: {
    value: T
    title: string
    icon: typeof FileText
  }[]
  onChange: (value: T) => void
}) {
  const baseId = useId()
  const columns = options.length <= 2

  return (
    <FieldSet>
      <FieldLegend variant="label">{label}</FieldLegend>
      <FieldDescription>{description}</FieldDescription>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className={
          columns
            ? 'grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-2'
            : 'flex flex-col gap-2'
        }
      >
        {options.map((option) => {
          const id = `${baseId}-${option.value}`
          const Icon = option.icon
          const selected = value === option.value
          return (
            <Item
              key={option.value}
              variant="outline"
              size="sm"
              render={<FieldLabel htmlFor={id} />}
              className={
                selected
                  ? 'border-foreground/20 bg-muted cursor-pointer'
                  : 'hover:bg-muted/50 cursor-pointer'
              }
            >
              <ItemMedia variant="icon">
                <Icon strokeWidth={1.75} aria-hidden />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="max-w-full truncate">{option.title}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <RadioGroupItem value={option.value} id={id} />
              </ItemActions>
            </Item>
          )
        })}
      </RadioGroup>
    </FieldSet>
  )
}

export function SectionDispositif({
  form,
  onChange
}: {
  form: ApurementPlanFormData
  onChange: FormUpdater
}) {
  return (
    <PlanSection
      title="Dispositif"
      description="Type de plan et nature de l’occupation du logement."
    >
      <ChoiceCards
        label="Type de plan"
        description="Quel dispositif rédigez-vous&nbsp;?"
        value={form.planType}
        onChange={(planType) => onChange({ planType })}
        options={[
          {
            value: 'repayment_plan' as PlanType,
            title: PLAN_TYPE_LABELS.repayment_plan,
            icon: FileText
          },
          {
            value: 'social_cohesion_protocol' as PlanType,
            title: PLAN_TYPE_LABELS.social_cohesion_protocol,
            icon: Handshake
          }
        ]}
      />
      <ChoiceCards
        label="Type d’occupation"
        description="Bail ou accession."
        value={form.occupancyType}
        onChange={(occupancyType) => onChange({ occupancyType })}
        options={[
          { value: 'lease' as OccupancyType, title: OCCUPANCY_TYPE_LABELS.lease, icon: Home },
          {
            value: 'accession' as OccupancyType,
            title: OCCUPANCY_TYPE_LABELS.accession,
            icon: KeyRound
          }
        ]}
      />
    </PlanSection>
  )
}

export function SectionLogement({
  form,
  onChange
}: {
  form: ApurementPlanFormData
  onChange: FormUpdater
}) {
  const addressId = useId()
  const postalCodeId = useId()
  const cityId = useId()

  return (
    <PlanSection title="Logement" description="Adresse du logement concerné.">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-auto min-w-48 flex-[2]">
          <FieldLabel htmlFor={addressId}>Adresse du logement</FieldLabel>
          <Input
            id={addressId}
            aria-label="Adresse du logement"
            value={form.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </Field>
        <Field className="w-auto min-w-24 flex-1">
          <FieldLabel htmlFor={postalCodeId}>Code postal</FieldLabel>
          <Input
            id={postalCodeId}
            aria-label="Code postal"
            inputMode="numeric"
            value={form.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
          />
        </Field>
        <Field className="w-auto min-w-32 flex-1">
          <FieldLabel htmlFor={cityId}>Ville</FieldLabel>
          <Input
            id={cityId}
            aria-label="Ville"
            value={form.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </Field>
      </div>
    </PlanSection>
  )
}

export function SectionSituationLocative({
  form,
  onChange
}: {
  form: ApurementPlanFormData
  onChange: FormUpdater
}) {
  const debtId = useId()
  const firstMissedPaymentId = useId()
  const paymentOrderId = useId()
  const socialWorkerNameId = useId()
  const socialWorkerOrganizationId = useId()
  const moratoriumEndId = useId()

  return (
    <PlanSection
      title="Situation locative"
      description="Impayé, procédures et interlocuteurs liés au dossier."
    >
      <MoneyField
        id={debtId}
        label="Dette locative"
        value={form.rentalDebt}
        onChange={(rentalDebt) => onChange({ rentalDebt })}
      />
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-auto min-w-40 flex-1">
          <FieldLabel htmlFor={firstMissedPaymentId}>Date du premier impayé</FieldLabel>
          <DatePicker
            id={firstMissedPaymentId}
            value={form.firstMissedPaymentDate}
            onChange={(firstMissedPaymentDate) => onChange({ firstMissedPaymentDate })}
          />
        </Field>
        <Field className="w-auto min-w-40 flex-1">
          <FieldLabel htmlFor={paymentOrderId}>Commandement de payer signifié</FieldLabel>
          <DatePicker
            id={paymentOrderId}
            value={form.paymentOrderDate}
            onChange={(paymentOrderDate) => onChange({ paymentOrderDate })}
            placeholder="Non signifié"
          />
        </Field>
      </div>
      <BooleanField
        label="CCAPEX saisie ?"
        description="Commission de coordination des actions de prévention des expulsions"
        value={form.ccapexOpened}
        onChange={(ccapexOpened) => onChange({ ccapexOpened })}
      />
      <BooleanField
        label="Travailleur social référent ?"
        description="Accompagnement social déjà en place"
        value={form.hasSocialWorker}
        onChange={(hasSocialWorker) => onChange({ hasSocialWorker })}
      />
      {form.hasSocialWorker ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-auto min-w-0 flex-1">
            <FieldLabel htmlFor={socialWorkerNameId}>Nom</FieldLabel>
            <Input
              id={socialWorkerNameId}
              aria-label="Nom du travailleur social"
              value={form.socialWorkerName}
              onChange={(e) => onChange({ socialWorkerName: e.target.value })}
            />
          </Field>
          <Field className="w-auto min-w-0 flex-1">
            <FieldLabel htmlFor={socialWorkerOrganizationId}>Structure</FieldLabel>
            <Input
              id={socialWorkerOrganizationId}
              aria-label="Structure"
              value={form.socialWorkerOrganization}
              onChange={(e) => onChange({ socialWorkerOrganization: e.target.value })}
            />
          </Field>
        </div>
      ) : null}
      <ChoiceCards
        label="Quelle est la situation Banque de France du locataire ?"
        description="Procédure de surendettement auprès de la Banque de France."
        value={form.banqueDeFranceStatus}
        onChange={(banqueDeFranceStatus) =>
          onChange({
            banqueDeFranceStatus,
            ...(banqueDeFranceStatus !== 'moratorium' ? { moratoriumEndDate: '' } : {})
          })
        }
        options={[
          {
            value: 'none' as BanqueDeFranceStatus,
            title: BANQUE_DE_FRANCE_STATUS_LABELS.none,
            icon: CircleOff
          },
          {
            value: 'admissible_pending' as BanqueDeFranceStatus,
            title: BANQUE_DE_FRANCE_STATUS_LABELS.admissible_pending,
            icon: FileSearch
          },
          {
            value: 'repayment_plan_active' as BanqueDeFranceStatus,
            title: BANQUE_DE_FRANCE_STATUS_LABELS.repayment_plan_active,
            icon: ListChecks
          },
          {
            value: 'moratorium' as BanqueDeFranceStatus,
            title: BANQUE_DE_FRANCE_STATUS_LABELS.moratorium,
            icon: PauseCircle
          }
        ]}
      />
      {form.banqueDeFranceStatus === 'moratorium' ? (
        <Field className="w-auto max-w-xs min-w-40">
          <FieldLabel htmlFor={moratoriumEndId}>Date de fin du moratoire</FieldLabel>
          <DatePicker
            id={moratoriumEndId}
            value={form.moratoriumEndDate}
            onChange={(moratoriumEndDate) => onChange({ moratoriumEndDate })}
          />
        </Field>
      ) : null}
    </PlanSection>
  )
}

export function SectionBudget({
  form,
  onIncomeChange,
  onExpensesChange
}: {
  form: ApurementPlanFormData
  onIncomeChange: (income: AmountLine[]) => void
  onExpensesChange: (expenses: AmountLine[]) => void
}) {
  const people = listHouseholdPeople(form.household)

  return (
    <PlanSection
      title="Budget du foyer"
      description="Ressources, charges et reste à vivre du ménage."
    >
      <FieldSet>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <FieldLegend variant="label">Ressources</FieldLegend>
            <FieldDescription>
              Revenus déclarés, assignables à chaque personne du foyer.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onIncomeChange([...form.income, createAmountLine()])}
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </div>
        {people.length === 0 ? (
          <FieldDescription>
            Renseignez d’abord le foyer pour assigner les ressources.
          </FieldDescription>
        ) : null}
        <AmountLineList
          items={form.income}
          presets={INCOME_PRESETS}
          placeholderLabel="Type de ressource"
          customPlaceholder="Libellé de la ressource"
          people={people}
          onChange={onIncomeChange}
        />
      </FieldSet>

      <FieldSet>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <FieldLegend variant="label">Charges</FieldLegend>
            <FieldDescription>
              Dépenses mensuelles récurrentes prises en compte dans le reste à vivre.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onExpensesChange([...form.expenses, createAmountLine()])}
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </div>
        <AmountLineList
          items={form.expenses}
          presets={EXPENSE_PRESETS}
          placeholderLabel="Type de charge"
          customPlaceholder="Libellé de la charge"
          onChange={onExpensesChange}
        />
      </FieldSet>

      <PlanCalculationsPanel form={form} />
    </PlanSection>
  )
}

function AdultRow({
  adult,
  canRemove,
  showLabels,
  onChange,
  onRemove
}: {
  adult: AdultMember
  canRemove: boolean
  showLabels: boolean
  onChange: (patch: Partial<AdultMember>) => void
  onRemove: () => void
}) {
  const firstNameId = useId()
  const lastNameId = useId()
  const birthDateId = useId()
  const employmentStatusId = useId()
  const cafNumberId = useId()
  const leaseHolderId = useId()
  const employmentSelectValue = encodeEmploymentSelectValue(
    adult.employmentStatus,
    adult.pensionFund
  )

  return (
    <div className="contents">
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={firstNameId}>Prénom</FieldLabel> : null}
        <Input
          id={firstNameId}
          aria-label="Prénom"
          value={adult.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
        />
      </Field>
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={lastNameId}>Nom</FieldLabel> : null}
        <Input
          id={lastNameId}
          aria-label="Nom"
          value={adult.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
        />
      </Field>
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={birthDateId}>Date de naissance</FieldLabel> : null}
        <DatePicker
          id={birthDateId}
          aria-label={showLabels ? undefined : 'Date de naissance'}
          className="w-full"
          value={adult.birthDate}
          onChange={(birthDate) => onChange({ birthDate })}
        />
      </Field>
      <Field className="min-w-0">
        {showLabels ? (
          <FieldLabel htmlFor={employmentStatusId}>Statut professionnel</FieldLabel>
        ) : null}
        <Select
          items={EMPLOYMENT_SELECT_ITEMS}
          value={employmentSelectValue}
          onValueChange={(v) => {
            if (v == null) return
            const decoded = decodeEmploymentSelectValue(v)
            if (!decoded) return
            onChange(decoded)
          }}
        >
          <SelectTrigger
            id={employmentStatusId}
            size="sm"
            className="w-full min-w-0"
            aria-label={showLabels ? undefined : 'Statut professionnel'}
          >
            <SelectValue placeholder="Statut professionnel" />
          </SelectTrigger>
          <SelectContent className="min-w-56">
            <EmploymentSelectGroupedItems />
          </SelectContent>
        </Select>
      </Field>
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={cafNumberId}>N° allocataire CAF</FieldLabel> : null}
        <Input
          id={cafNumberId}
          aria-label="N° allocataire CAF"
          value={adult.cafNumber}
          onChange={(e) => onChange({ cafNumber: e.target.value })}
        />
      </Field>
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={leaseHolderId}>Titulaire</FieldLabel> : null}
        <div className="flex h-8 items-center">
          <Switch
            id={leaseHolderId}
            checked={adult.isLeaseHolder}
            onCheckedChange={(checked) => onChange({ isLeaseHolder: checked })}
            aria-label={showLabels ? undefined : 'Titulaire du bail'}
          />
        </div>
      </Field>
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="self-end"
          aria-label="Retirer"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      ) : (
        <span className="size-8 self-end" aria-hidden />
      )}
    </div>
  )
}

function ChildRow({
  child,
  showLabels,
  onChange,
  onRemove
}: {
  child: ChildMember
  showLabels: boolean
  onChange: (patch: Partial<ChildMember>) => void
  onRemove: () => void
}) {
  const firstNameId = useId()
  const lastNameId = useId()
  const birthDateId = useId()
  const dependentId = useId()

  return (
    <div className="contents">
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={firstNameId}>Prénom</FieldLabel> : null}
        <Input
          id={firstNameId}
          aria-label="Prénom"
          value={child.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
        />
      </Field>
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={lastNameId}>Nom</FieldLabel> : null}
        <Input
          id={lastNameId}
          aria-label="Nom"
          value={child.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
        />
      </Field>
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={birthDateId}>Date de naissance</FieldLabel> : null}
        <DatePicker
          id={birthDateId}
          aria-label={showLabels ? undefined : 'Date de naissance'}
          className="w-full"
          value={child.birthDate}
          onChange={(birthDate) => onChange({ birthDate })}
        />
      </Field>
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={dependentId}>À charge</FieldLabel> : null}
        <div className="flex h-8 items-center">
          <Switch
            id={dependentId}
            checked={child.isDependent}
            onCheckedChange={(checked) => onChange({ isDependent: checked })}
            aria-label={showLabels ? undefined : 'À charge'}
          />
        </div>
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="self-end"
        aria-label="Retirer"
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

export function SectionFamille({
  form,
  onHouseholdChange,
  onIdsChange
}: {
  form: ApurementPlanFormData
  onHouseholdChange: SectionUpdater<ApurementPlanFormData['household']>
  onIdsChange: (patch: Partial<Pick<ApurementPlanFormData, 'idLocataire' | 'idClient'>>) => void
}) {
  const household = form.household
  const idLocataireId = useId()
  const idClientId = useId()

  return (
    <PlanSection title="Foyer" description="Personnes occupant le logement et titulaires du bail.">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-auto min-w-40 flex-1">
          <FieldLabel htmlFor={idLocataireId}>Id locataire</FieldLabel>
          <Input
            id={idLocataireId}
            aria-label="Id locataire"
            value={form.idLocataire}
            onChange={(e) => onIdsChange({ idLocataire: e.target.value })}
          />
        </Field>
        <Field className="w-auto min-w-40 flex-1">
          <FieldLabel htmlFor={idClientId}>Id client</FieldLabel>
          <Input
            id={idClientId}
            aria-label="Id client"
            value={form.idClient}
            onChange={(e) => onIdsChange({ idClient: e.target.value })}
          />
        </Field>
      </div>

      <FieldSet>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <FieldLegend variant="label">Adultes</FieldLegend>
            <FieldDescription>
              Identifiez les adultes (+18 ans) occupant le logement.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onHouseholdChange({
                adults: [...household.adults, createAdultMember({ isLeaseHolder: false })]
              })
            }
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem_minmax(0,1.25fr)_minmax(0,1fr)_auto_2rem] items-start gap-x-3 gap-y-4">
          {household.adults.map((adult, index) => (
            <AdultRow
              key={adult.id}
              adult={adult}
              canRemove={household.adults.length > 1}
              showLabels={index === 0}
              onChange={(patch) =>
                onHouseholdChange({
                  adults: household.adults.map((member) =>
                    member.id === adult.id ? { ...member, ...patch } : member
                  )
                })
              }
              onRemove={() =>
                onHouseholdChange({
                  adults: household.adults.filter((member) => member.id !== adult.id)
                })
              }
            />
          ))}
        </div>
      </FieldSet>

      <FieldSet>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <FieldLegend variant="label">Enfants</FieldLegend>
            <FieldDescription>
              Identifiez les enfants (-18 ans) occupant le logement.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onHouseholdChange({ children: [...household.children, createChildMember()] })
            }
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </div>
        {household.children.length === 0 ? (
          <FieldDescription>Aucun enfant renseigné.</FieldDescription>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem_auto_2rem] items-start gap-x-3 gap-y-4">
            {household.children.map((child, index) => (
              <ChildRow
                key={child.id}
                child={child}
                showLabels={index === 0}
                onChange={(patch) =>
                  onHouseholdChange({
                    children: household.children.map((member) =>
                      member.id === child.id ? { ...member, ...patch } : member
                    )
                  })
                }
                onRemove={() =>
                  onHouseholdChange({
                    children: household.children.filter((member) => member.id !== child.id)
                  })
                }
              />
            ))}
          </div>
        )}
      </FieldSet>
    </PlanSection>
  )
}

export function SectionAides({
  items,
  onChange
}: {
  items: AidItem[]
  onChange: (items: AidItem[]) => void
}) {
  return (
    <PlanSection
      title="Aides"
      description="Dispositifs d’aide déjà demandés ou à solliciter."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, createAidItem()])}
        >
          <Plus data-icon="inline-start" />
          Ajouter
        </Button>
      }
    >
      <AidList items={items} onChange={onChange} />
    </PlanSection>
  )
}

export function SectionEcheancier({
  form,
  onChange
}: {
  form: ApurementPlanFormData
  onChange: FormUpdater
}) {
  const count = form.installments.length
  const canRemove = count > 1

  const firstYearMonth = form.installments[0]?.yearMonth ?? firstInstallmentYearMonth(form)

  const setInstallmentCount = (nextCount: number) => {
    onChange({
      installments: buildInstallments({
        debt: form.rentalDebt,
        count: clampInstallmentCount(nextCount),
        firstYearMonth,
        existing: form.installments
      })
    })
  }

  return (
    <PlanSection
      title="Échéancier"
      description="Échéances mensuelles pour rembourser la dette (24 par défaut)."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setInstallmentCount(count + 1)}
        >
          <Plus data-icon="inline-start" />
          Ajouter une échéance
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canRemove}
          onClick={() => setInstallmentCount(count - 1)}
        >
          <Trash2 data-icon="inline-start" />
          Retirer une échéance
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              installments: buildInstallments({
                debt: form.rentalDebt,
                count: DEFAULT_PLAN_DURATION_MONTHS,
                firstYearMonth: firstInstallmentYearMonth(form)
              })
            })
          }
        >
          <RotateCcw data-icon="inline-start" />
          Réinitialiser
        </Button>
      </div>
      <div className="grid max-w-lg grid-cols-[3.5rem_7rem_minmax(0,1fr)_2rem] items-start gap-x-3 gap-y-2">
        <span className="text-muted-foreground text-sm font-medium">N°</span>
        <span className="text-muted-foreground text-sm font-medium">Échéance</span>
        <span className="text-muted-foreground text-sm font-medium">Montant</span>
        <span className="size-8" aria-hidden />
        {form.installments.map((installment, index) => (
          <div key={installment.id} className="contents">
            <span className="text-muted-foreground flex h-8 items-center text-sm tabular-nums">
              {index + 1}/{count}
            </span>
            <Field className="min-w-0">
              <YearMonthInput
                aria-label={`Échéance ${index + 1}`}
                value={installment.yearMonth}
                onChange={(yearMonth) =>
                  onChange({
                    installments: updateInstallmentYearMonth(form.installments, index, yearMonth)
                  })
                }
              />
            </Field>
            <Field className="min-w-0">
              <MoneyInput
                aria-label={`Montant ${index + 1}`}
                value={installment.amount}
                onChange={(amount) =>
                  onChange({
                    installments: updateInstallmentAmount(
                      form.installments,
                      index,
                      amount,
                      form.rentalDebt
                    )
                  })
                }
              />
            </Field>
            {canRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-center"
                aria-label={`Retirer l’échéance ${index + 1}`}
                onClick={() => {
                  const remaining = form.installments.filter((_, i) => i !== index)
                  onChange({
                    installments: buildInstallments({
                      debt: form.rentalDebt,
                      count: remaining.length,
                      firstYearMonth: remaining[0]?.yearMonth ?? firstYearMonth,
                      existing: remaining
                    })
                  })
                }}
              >
                <Trash2 />
              </Button>
            ) : (
              <span className="size-8 self-center" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </PlanSection>
  )
}
