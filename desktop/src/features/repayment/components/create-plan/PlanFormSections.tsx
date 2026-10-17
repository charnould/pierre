import {
  CircleOff,
  FileSearch,
  FileText,
  Gavel,
  Handshake,
  Hourglass,
  Landmark,
  ListChecks,
  LogOut,
  Mail,
  PauseCircle,
  Plus,
  RotateCcw,
  Scale,
  Trash2
} from 'lucide-react'
import { useId, useState } from 'react'

import { ChoiceTile } from '@/shared/components/ChoiceTile'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'

import { MAX_SCHEDULE_MONTHS } from '../../../../../../shared/repayment-plan'
import {
  createAdultMember,
  createAidItem,
  createChildMember
} from '../../lib/apurement-plan/defaults'
import {
  buildInstallments,
  clampInstallmentCount,
  firstInstallmentDate
} from '../../lib/apurement-plan/installments'
import {
  BANQUE_DE_FRANCE_STATUS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  PLAN_TYPE_LABELS,
  PROCEDURE_STAGE_LABELS,
  type AdultMember,
  type AidItem,
  type RepaymentPlanForm,
  type BanqueDeFranceStatus,
  type ChildMember,
  type EmploymentStatus,
  type PlanType,
  type ProcedureStage
} from '../../lib/apurement-plan/types'
import { repaymentCreatePlanConfig } from '../../lib/repayment-create-plan-config'
import { AidList } from './AidList'
import { BooleanField } from './BooleanField'
import { DatePicker } from './DatePicker'
import { InstallmentSchedule } from './InstallmentSchedule'
import { MoneyInput } from './MoneyInput'
import { PlanSection } from './PlanSection'

type FormUpdater = (patch: Partial<RepaymentPlanForm>) => void
type SectionUpdater<T> = (patch: Partial<T>) => void

const employmentStatusItems = Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => ({
  value: value as EmploymentStatus,
  label
}))

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
  value: T | ''
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
        className={columns ? 'grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]' : 'flex flex-col'}
        value={value}
        onValueChange={(next) => onChange(next as T)}
      >
        {options.map((option) => {
          const id = `${baseId}-${option.value}`
          const Icon = option.icon
          const selected = value === option.value
          return (
            <ChoiceTile
              key={option.value}
              as="label"
              htmlFor={id}
              icon={<Icon strokeWidth={1.75} aria-hidden />}
              title={option.title}
              selected={selected}
              interactive
              signal={<RadioGroupItem value={option.value} id={id} />}
            />
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
  form: RepaymentPlanForm
  onChange: FormUpdater
}) {
  return (
    <PlanSection title="Dispositif" description="Type de plan.">
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
    </PlanSection>
  )
}

export function SectionLogement({
  form,
  onChange
}: {
  form: RepaymentPlanForm
  onChange: FormUpdater
}) {
  const addressId = useId()
  const idLotId = useId()
  const postalCodeId = useId()
  const cityId = useId()

  return (
    <PlanSection title="Logement" description="Adresse du logement concerné.">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-auto min-w-52 flex-1">
          <FieldLabel htmlFor={idLotId}>Identifiant du patrimoine</FieldLabel>
          <Input
            id={idLotId}
            aria-label="Identifiant du patrimoine"
            value={form.idLot}
            onChange={(e) => onChange({ idLot: e.target.value })}
          />
        </Field>
        <Field className="w-auto min-w-48 flex-2">
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
  form: RepaymentPlanForm
  onChange: FormUpdater
}) {
  const debtId = useId()
  const firstMissedPaymentId = useId()
  const procedureStageDateId = useId()
  const ccapexDateId = useId()
  const ctesiDateId = useId()
  const socialWorkerNameId = useId()
  const socialWorkerOrganizationId = useId()
  const socialWorkerContactId = useId()
  const socialWorkerLastContactDateId = useId()
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
      </div>
      <ChoiceCards<ProcedureStage>
        label="Stade actuel de la procédure"
        description="Où en est le recouvrement de ce dossier ?"
        value={form.procedureStage}
        onChange={(procedureStage) => onChange({ procedureStage })}
        options={[
          { value: 'amiable', title: PROCEDURE_STAGE_LABELS.amiable, icon: Handshake },
          { value: 'cdp', title: PROCEDURE_STAGE_LABELS.cdp, icon: FileText },
          { value: 'assignation', title: PROCEDURE_STAGE_LABELS.assignation, icon: Landmark },
          { value: 'audience', title: PROCEDURE_STAGE_LABELS.audience, icon: Gavel },
          { value: 'delibere', title: PROCEDURE_STAGE_LABELS.delibere, icon: Hourglass },
          { value: 'jugement', title: PROCEDURE_STAGE_LABELS.jugement, icon: Scale },
          { value: 'signification', title: PROCEDURE_STAGE_LABELS.signification, icon: Mail },
          { value: 'cql', title: PROCEDURE_STAGE_LABELS.cql, icon: LogOut }
        ]}
      />
      {form.procedureStage ? (
        <Field className="w-auto max-w-xs min-w-40">
          <FieldLabel htmlFor={procedureStageDateId}>Date</FieldLabel>
          <DatePicker
            id={procedureStageDateId}
            value={form.procedureStageDate}
            onChange={(procedureStageDate) => onChange({ procedureStageDate })}
          />
        </Field>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-auto min-w-40 flex-1">
          <FieldLabel htmlFor={ccapexDateId}>CCAPEX saisie ?</FieldLabel>
          <FieldDescription>
            Commission de coordination des actions de prévention des expulsions
          </FieldDescription>
          <DatePicker
            id={ccapexDateId}
            value={form.ccapexDate}
            onChange={(ccapexDate) => onChange({ ccapexDate })}
            placeholder="Non saisie"
          />
        </Field>
        <Field className="w-auto min-w-40 flex-1">
          <FieldLabel htmlFor={ctesiDateId}>CTESI saisie ?</FieldLabel>
          <FieldDescription>
            Commission technique d'examens de situations individuelles
          </FieldDescription>
          <DatePicker
            id={ctesiDateId}
            value={form.ctesiDate}
            onChange={(ctesiDate) => onChange({ ctesiDate })}
            placeholder="Non saisie"
          />
        </Field>
      </div>
      <BooleanField
        label="Le locataire a été rencontré à son domicile ?"
        value={form.tenantVisitedAtHome}
        onChange={(tenantVisitedAtHome) => onChange({ tenantVisitedAtHome })}
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
          <Field className="w-auto min-w-0 flex-1">
            <FieldLabel htmlFor={socialWorkerContactId}>Coordonnées</FieldLabel>
            <Input
              id={socialWorkerContactId}
              aria-label="Coordonnées du travailleur social"
              value={form.socialWorkerContact}
              onChange={(e) => onChange({ socialWorkerContact: e.target.value })}
            />
          </Field>
          <Field className="w-auto min-w-44">
            <FieldLabel htmlFor={socialWorkerLastContactDateId}>
              Dernier contact du bailleur
            </FieldLabel>
            <DatePicker
              id={socialWorkerLastContactDateId}
              className="w-full"
              value={form.socialWorkerLastContactDate}
              onChange={(socialWorkerLastContactDate) => onChange({ socialWorkerLastContactDate })}
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
            value: 'prp' as BanqueDeFranceStatus,
            title: BANQUE_DE_FRANCE_STATUS_LABELS.prp,
            icon: Scale
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
  const employerId = useId()
  const cafNumberId = useId()
  const leaseHolderId = useId()
  const occupantId = useId()

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
          items={employmentStatusItems}
          value={adult.employmentStatus}
          onValueChange={(value) => {
            if (value == null) return
            onChange({ employmentStatus: value as EmploymentStatus })
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
            {employmentStatusItems.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={employerId}>Employeur</FieldLabel> : null}
        <Input
          id={employerId}
          aria-label="Employeur"
          value={adult.employer}
          onChange={(e) => onChange({ employer: e.target.value })}
        />
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
      <Field className="min-w-0">
        {showLabels ? <FieldLabel htmlFor={occupantId}>Occupant</FieldLabel> : null}
        <div className="flex h-8 items-center">
          <Switch
            id={occupantId}
            checked={adult.isOccupant}
            onCheckedChange={(checked) => onChange({ isOccupant: checked })}
            aria-label={showLabels ? undefined : 'Occupant'}
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
  form: RepaymentPlanForm
  onHouseholdChange: SectionUpdater<RepaymentPlanForm['household']>
  onIdsChange: (
    patch: Partial<
      Pick<RepaymentPlanForm, 'idLocataire' | 'idClient' | 'amendmentSigned' | 'noticeDate'>
    >
  ) => void
}) {
  const household = form.household
  const idLocataireId = useId()
  const idClientId = useId()
  const noticeDateId = useId()

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
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_2rem] items-start gap-x-3 gap-y-4">
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

      <BooleanField
        label="Y a-t-il un avenant signé dans Aravis ?"
        value={form.amendmentSigned}
        onChange={(amendmentSigned) => onIdsChange({ amendmentSigned })}
      />
      <Field className="max-w-xs">
        <FieldLabel htmlFor={noticeDateId}>Date de dépôt du préavis</FieldLabel>
        <FieldDescription>
          Le cas échéant, à quelle date le congé a-t-il été déposé ?
        </FieldDescription>
        <DatePicker
          id={noticeDateId}
          value={form.noticeDate}
          onChange={(noticeDate) => onIdsChange({ noticeDate })}
        />
      </Field>

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
  form: RepaymentPlanForm
  onChange: FormUpdater
}) {
  const count = form.installments.length
  const canRemove = count > 1
  const { schedule } = repaymentCreatePlanConfig()
  const [pendingThreshold, setPendingThreshold] = useState<
    (typeof schedule.thresholds)[number] | null
  >(null)

  const firstDate = form.installments[0]?.date ?? firstInstallmentDate(form)

  const setInstallmentCount = (nextCount: number) => {
    onChange({
      installments: buildInstallments({
        debt: form.rentalDebt,
        count: clampInstallmentCount(nextCount),
        firstDate,
        existing: form.installments
      })
    })
  }

  const addInstallment = () => {
    if (count >= MAX_SCHEDULE_MONTHS) return
    const threshold = schedule.thresholds.find((item) => item.months === count)
    if (threshold) {
      setPendingThreshold(threshold)
      return
    }
    setInstallmentCount(count + 1)
  }

  return (
    <PlanSection
      title="Échéancier"
      description={`Échéances mensuelles pour rembourser la dette (${schedule.defaultMonths} par défaut).`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={count >= MAX_SCHEDULE_MONTHS}
          onClick={addInstallment}
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
                count: schedule.defaultMonths,
                firstDate: firstInstallmentDate(form)
              })
            })
          }
        >
          <RotateCcw data-icon="inline-start" />
          Réinitialiser
        </Button>
      </div>
      <InstallmentSchedule form={form} onChange={onChange} />
      <ConfirmDialog
        open={pendingThreshold != null}
        title={pendingThreshold ? `Plus de ${pendingThreshold.months} mensualités !` : ''}
        description={pendingThreshold?.message ?? ''}
        confirmLabel="J’ai compris"
        onConfirm={() => {
          setPendingThreshold(null)
          setInstallmentCount(count + 1)
        }}
        onCancel={() => setPendingThreshold(null)}
      />
    </PlanSection>
  )
}
