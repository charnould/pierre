import { IdCard, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { DirectoryList, DirectoryRow } from '@/shared/components/DirectoryList'
import { Docket } from '@/shared/components/icons/koboyo-empty'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import { toast } from '@/shared/components/ui/toast'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { resolveOrgUserByLoginOrEmail } from '@/shared/lib/org-users-cache'
import type {
  AdminUser,
  AdminUserProfile,
  AdminUsersData,
  UserPrincipal
} from '@/shared/types/users'

import { ProfileFormDialog } from './ProfileFormDialog'
import { UserFormDialog } from './UserFormDialog'

interface Props {
  url: string
  user: UserPrincipal
  onCurrentUserPasswordChange: () => Promise<void>
  onUserChange: (user: UserPrincipal) => void
}

const profileColumns = 'grid-cols-[minmax(14rem,1.4fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_4rem]'
const userColumns = 'grid-cols-[2rem_minmax(14rem,1.4fr)_minmax(10rem,1fr)_8rem_4rem]'

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function profileName(entry: AdminUser, profiles: AdminUserProfile[]) {
  if (!entry.profileId) return 'Personnalisé'
  return profiles.find((profile) => profile.id === entry.profileId)?.name ?? 'Personnalisé'
}

export function UserIdentity({ email }: { email: string }) {
  const photoUrl = useUserAvatar(email)
  const orgUser = resolveOrgUserByLoginOrEmail(email)
  const separator = email.indexOf('@')
  const login = orgUser?.login || (separator > 0 ? email.slice(0, separator) : email)
  const name = orgUser?.displayName?.trim() || login

  return (
    <div className="flex min-w-0 items-center gap-2">
      <UserAvatar photoUrl={photoUrl} name={name} login={login} />
      <div className="flex min-w-0 flex-col items-start">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-muted-foreground truncate text-xs">{email}</div>
      </div>
    </div>
  )
}

export function UsersPanel({ url, user, onCurrentUserPasswordChange, onUserChange }: Props) {
  const [data, setData] = useState<AdminUsersData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [profileFormOpen, setProfileFormOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<AdminUserProfile | null>(null)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const [deletingProfile, setDeletingProfile] = useState<AdminUserProfile | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assigning, setAssigning] = useState(false)

  const load = useCallback(async () => {
    const response = await window.api?.getAdminUsers({ url })
    if (!response) {
      setLoadError('Impossible de joindre le serveur.')
      return
    }
    if ('error' in response) {
      setLoadError(response.error.message)
      return
    }
    setData(response.data)
    setLoadError('')
  }, [url])

  useEffect(() => {
    let active = true
    void Promise.resolve(window.api?.getAdminUsers({ url }) ?? null).then((response) => {
      if (!active) return
      if (!response) {
        setLoadError('Impossible de joindre le serveur.')
        return
      }
      if ('error' in response) {
        setLoadError(response.error.message)
        return
      }
      setData(response.data)
      setLoadError('')
    })
    return () => {
      active = false
    }
  }, [url])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(entry: AdminUser) {
    setEditing(entry)
    setFormOpen(true)
  }

  function openCreateProfile() {
    setEditingProfile(null)
    setProfileFormOpen(true)
  }

  function openEditProfile(entry: AdminUserProfile) {
    setEditingProfile(entry)
    setProfileFormOpen(true)
  }

  function handleSaved(saved: AdminUser) {
    setData((current) => {
      if (!current) return current
      const users = current.users.some(({ email }) => email === saved.email)
        ? current.users.map((entry) => (entry.email === saved.email ? saved : entry))
        : [...current.users, saved]
      return { ...current, users: users.sort((a, b) => a.email.localeCompare(b.email)) }
    })
    if (saved.email === user.email) onUserChange(saved)
  }

  function handleProfileSaved(saved: AdminUserProfile) {
    setData((current) => {
      if (!current) return current
      const profiles = current.profiles.some(({ id }) => id === saved.id)
        ? current.profiles.map((entry) => (entry.id === saved.id ? saved : entry))
        : [...current.profiles, saved]
      return {
        ...current,
        profiles: profiles.sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        users: current.users.map((entry) =>
          entry.profileId === saved.id
            ? { ...entry, moduleIds: saved.moduleIds, chatbotIds: saved.chatbotIds }
            : entry
        )
      }
    })
    const mine = data?.users.find((entry) => entry.email === user.email)
    if (mine?.profileId === saved.id) {
      onUserChange({
        email: user.email,
        isAdministrator: mine.isAdministrator,
        moduleIds: saved.moduleIds,
        chatbotIds: saved.chatbotIds
      })
    }
  }

  async function importCsv() {
    const response = await window.api?.importAdminUsersCsv({ url })
    if (!response) return
    if ('error' in response) {
      const first = response.error.details?.[0]
      toast.add({
        title: response.error.message,
        description: first ? `Ligne ${first.row} : ${first.message}` : undefined,
        type: 'error'
      })
      return
    }
    await load()
    toast.add({
      title: 'Import terminé',
      description: `${response.data.created} créé(s), ${response.data.updated} mis à jour.`,
      type: 'success'
    })
  }

  async function confirmDelete() {
    if (!deleting) return
    const response = await window.api?.deleteAdminUser({ url, email: deleting.email })
    if (!response) {
      toast.add({ title: 'Impossible de joindre le serveur.', type: 'error' })
      return
    }
    if ('error' in response) {
      toast.add({ title: response.error.message, type: 'error' })
      return
    }
    setData((current) =>
      current
        ? {
            ...current,
            users: current.users.filter(({ email }) => email !== deleting.email)
          }
        : current
    )
    setSelected((current) => {
      const next = new Set(current)
      next.delete(deleting.email)
      return next
    })
    setDeleting(null)
    toast.add({ title: 'Utilisateur supprimé', type: 'success' })
  }

  async function confirmDeleteProfile() {
    if (!deletingProfile) return
    const response = await window.api?.deleteAdminUserProfile({ url, id: deletingProfile.id })
    if (!response) {
      toast.add({ title: 'Impossible de joindre le serveur.', type: 'error' })
      return
    }
    if ('error' in response) {
      toast.add({ title: response.error.message, type: 'error' })
      return
    }
    setData((current) =>
      current
        ? {
            ...current,
            profiles: current.profiles.filter(({ id }) => id !== deletingProfile.id)
          }
        : current
    )
    setDeletingProfile(null)
    toast.add({ title: 'Profil supprimé', type: 'success' })
  }

  function toggleSelected(email: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(email)
      else next.delete(email)
      return next
    })
  }

  async function assignProfile(profileId: string) {
    if (!data || assigning) return
    const emails = data.users
      .filter((entry) => selected.has(entry.email))
      .map((entry) => entry.email)
    if (emails.length === 0) return
    setAssigning(true)
    for (const email of emails) {
      const response = await window.api?.patchAdminUser({ url, email, profileId })
      if (!response) {
        toast.add({ title: 'Impossible de joindre le serveur.', description: email, type: 'error' })
        setAssigning(false)
        return
      }
      if ('error' in response) {
        toast.add({ title: response.error.message, description: email, type: 'error' })
        setAssigning(false)
        return
      }
      handleSaved(response.data.user)
    }
    setSelected(new Set())
    setAssigning(false)
    toast.add({ title: 'Profil affecté', type: 'success' })
  }

  const profileCount = data?.profiles.length ?? 0
  const userCount = data?.users.length ?? 0
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {loadError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Docket />
            </EmptyMedia>
            <EmptyTitle>Utilisateurs indisponibles</EmptyTitle>
            <EmptyDescription>{loadError}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" variant="outline" onClick={() => void load()}>
              Réessayer
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <section>
            <header className="border-border bg-background flex shrink-0 items-center gap-2 border-b px-4 py-2">
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <h2 className="m-0 font-sans text-xl leading-6 font-semibold tracking-tight text-balance">
                  Profils
                </h2>
                <span className="text-muted-foreground font-sans text-xl leading-6 font-medium tracking-tight">
                  ·
                </span>
                <span className="text-muted-foreground font-sans text-xl leading-6 font-medium tracking-tight tabular-nums">
                  {countLabel(profileCount, 'profil', 'profils')}
                </span>
              </div>
              <Button type="button" onClick={openCreateProfile}>
                <Plus data-icon="inline-start" />
                Créer
              </Button>
            </header>
            {data && data.profiles.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Docket />
                  </EmptyMedia>
                  <EmptyTitle>Aucun profil</EmptyTitle>
                  <EmptyDescription>
                    Créez un profil pour préremplir les accès des utilisateurs.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <DirectoryList>
                {data?.profiles.map((entry) => (
                  <DirectoryRow
                    key={entry.id}
                    className={profileColumns}
                    onSelect={() => openEditProfile(entry)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar>
                        <AvatarFallback>
                          <IdCard className="size-4" aria-hidden />
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate text-sm font-medium">{entry.name}</div>
                    </div>
                    <div className="text-muted-foreground pierre-type-data text-start">
                      {countLabel(entry.moduleIds.length, 'module', 'modules')}
                    </div>
                    <div className="text-muted-foreground pierre-type-data text-start">
                      {countLabel(entry.chatbotIds.length, 'chatbot', 'chatbots')}
                    </div>
                    <div className="flex items-center gap-1 text-start">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Modifier ${entry.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditProfile(entry)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer ${entry.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setDeletingProfile(entry)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </DirectoryRow>
                ))}
              </DirectoryList>
            )}
          </section>

          <section>
            <header className="border-border bg-background flex shrink-0 items-center gap-2 border-b px-4 py-2">
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <h2 className="m-0 font-sans text-xl leading-6 font-semibold tracking-tight text-balance">
                  Utilisateurs
                </h2>
                <span className="text-muted-foreground font-sans text-xl leading-6 font-medium tracking-tight">
                  ·
                </span>
                <span className="text-muted-foreground font-sans text-xl leading-6 font-medium tracking-tight tabular-nums">
                  {countLabel(userCount, 'utilisateur', 'utilisateurs')}
                </span>
              </div>
              <Button type="button" variant="outline" onClick={() => void importCsv()}>
                <Upload data-icon="inline-start" />
                Importer un CSV
              </Button>
              {selected.size > 0 ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        disabled={profileCount === 0 || assigning}
                      />
                    }
                  >
                    Affecter un profil
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-auto min-w-48">
                    <DropdownMenuGroup>
                      {data?.profiles.map((profile) => (
                        <DropdownMenuItem
                          key={profile.id}
                          disabled={assigning}
                          onClick={() => void assignProfile(profile.id)}
                        >
                          {profile.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <Button type="button" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                Créer
              </Button>
            </header>
            {!data && !loadError ? (
              <div className="flex h-48 items-center justify-center">
                <Spinner />
              </div>
            ) : data?.users.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Docket />
                  </EmptyMedia>
                  <EmptyTitle>Aucun utilisateur</EmptyTitle>
                  <EmptyDescription>
                    Créez le premier utilisateur de cette organisation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <DirectoryList>
                {data?.users.map((entry) => (
                  <DirectoryRow
                    key={entry.email}
                    className={userColumns}
                    onSelect={() => openEdit(entry)}
                  >
                    <div className="flex items-center" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(entry.email)}
                        disabled={assigning}
                        aria-label={`Sélectionner ${entry.email}`}
                        onCheckedChange={(checked) => toggleSelected(entry.email, checked === true)}
                      />
                    </div>
                    <UserIdentity email={entry.email} />
                    <div className="text-muted-foreground pierre-type-data text-start">
                      {profileName(entry, data.profiles)}
                    </div>
                    <div className="pierre-type-data text-start">
                      {entry.isAdministrator ? 'Administrateur' : 'Utilisateur'}
                    </div>
                    <div className="flex items-center gap-1 text-start">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Modifier ${entry.email}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          openEdit(entry)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer ${entry.email}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setDeleting(entry)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </DirectoryRow>
                ))}
              </DirectoryList>
            )}
          </section>
        </div>
      )}

      {data && formOpen ? (
        <UserFormDialog
          url={url}
          currentUserEmail={user.email}
          user={editing}
          catalogues={data}
          onClose={() => setFormOpen(false)}
          onCurrentUserPasswordChange={onCurrentUserPasswordChange}
          onSaved={handleSaved}
        />
      ) : null}
      {data && profileFormOpen ? (
        <ProfileFormDialog
          url={url}
          profile={editingProfile}
          catalogues={data}
          onClose={() => setProfileFormOpen(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer l’utilisateur"
        description={
          deleting
            ? `Le compte ${deleting.email} sera supprimé définitivement.`
            : 'Ce compte sera supprimé définitivement.'
        }
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={deletingProfile !== null}
        title="Supprimer le profil"
        description={
          deletingProfile
            ? `Le profil ${deletingProfile.name} sera supprimé définitivement.`
            : 'Ce profil sera supprimé définitivement.'
        }
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onCancel={() => setDeletingProfile(null)}
        onConfirm={() => void confirmDeleteProfile()}
      />
    </div>
  )
}
