import { useCallback, useMemo, useReducer } from 'react'

import type { RepaymentComposeMode } from '../components/RepaymentComposeBlock'
import type { RepaymentAdvancement } from '../lib/repayment-advancement'
import type { RepaymentBucketId } from '../lib/repayment-bucket'
import { sameRepaymentTagSet } from '../lib/repayment-tags'

type ComposeState = {
  mode: RepaymentComposeMode
  bucket: RepaymentBucketId | null
  tags: string[]
  comment: string
  editingNoteId: number | null
  epoch: number
}

type ComposeAction =
  | { type: 'reset' }
  | { type: 'start-note'; comment: string }
  | { type: 'start-edit-note'; id: number; comment: string }
  | { type: 'start-advancement'; advancement: RepaymentAdvancement }
  | { type: 'start-assignment' }
  | { type: 'start-todo' }
  | { type: 'start-action' }
  | { type: 'start-rcs' }
  | { type: 'start-email' }
  | { type: 'start-tags'; tags: string[] }
  | { type: 'set-bucket'; bucket: RepaymentBucketId | null }
  | { type: 'set-tags'; tags: string[] }
  | { type: 'set-comment'; comment: string }

const RESTING_STATE: Pick<ComposeState, 'mode' | 'bucket' | 'tags' | 'comment' | 'editingNoteId'> =
  {
    mode: null,
    bucket: null,
    tags: [],
    comment: '',
    editingNoteId: null
  }

function composeReducer(state: ComposeState, action: ComposeAction): ComposeState {
  switch (action.type) {
    case 'reset':
      return { ...RESTING_STATE, epoch: state.epoch + 1 }
    case 'start-note':
      return {
        ...state,
        mode: 'note',
        bucket: null,
        comment: action.comment,
        editingNoteId: null
      }
    case 'start-edit-note':
      return {
        ...state,
        mode: 'edit_note',
        bucket: null,
        comment: action.comment,
        editingNoteId: action.id,
        epoch: state.epoch + 1
      }
    case 'start-advancement':
      return {
        ...state,
        mode: 'advancement',
        bucket: action.advancement.bucket,
        comment: '',
        editingNoteId: null
      }
    case 'start-assignment':
      return { ...state, mode: 'assign_gestionnaire', comment: '', editingNoteId: null }
    case 'start-todo':
      return { ...state, mode: 'todo', bucket: null, comment: '', editingNoteId: null }
    case 'start-action':
      return { ...state, mode: 'action', bucket: null, comment: '', editingNoteId: null }
    case 'start-rcs':
      return { ...state, mode: 'rcs', bucket: null, comment: '', editingNoteId: null }
    case 'start-email':
      return { ...state, mode: 'email', bucket: null, comment: '', editingNoteId: null }
    case 'start-tags':
      return { ...state, mode: 'tags', tags: action.tags, comment: '', editingNoteId: null }
    case 'set-bucket':
      return { ...state, bucket: action.bucket }
    case 'set-tags':
      return { ...state, tags: action.tags }
    case 'set-comment':
      return { ...state, comment: action.comment }
  }
}

export function useRepaymentComposeState(
  advancement: RepaymentAdvancement,
  currentTags: readonly string[] = []
) {
  const [state, dispatch] = useReducer(composeReducer, { ...RESTING_STATE, epoch: 0 })

  const reset = useCallback(() => dispatch({ type: 'reset' }), [])
  const startNote = useCallback((comment = '') => dispatch({ type: 'start-note', comment }), [])
  const startEditNote = useCallback(
    (id: number, comment: string) => dispatch({ type: 'start-edit-note', id, comment }),
    []
  )
  const startAdvancement = useCallback(
    () => dispatch({ type: 'start-advancement', advancement }),
    [advancement]
  )
  const startAssignment = useCallback(() => dispatch({ type: 'start-assignment' }), [])
  const startTodo = useCallback(() => dispatch({ type: 'start-todo' }), [])
  const startAction = useCallback(() => dispatch({ type: 'start-action' }), [])
  const startRcs = useCallback(() => dispatch({ type: 'start-rcs' }), [])
  const startEmail = useCallback(() => dispatch({ type: 'start-email' }), [])
  const startTags = useCallback(
    () => dispatch({ type: 'start-tags', tags: [...currentTags] }),
    [currentTags]
  )
  const setBucket = useCallback(
    (bucket: RepaymentBucketId | null) => dispatch({ type: 'set-bucket', bucket }),
    []
  )
  const setTags = useCallback((tags: string[]) => dispatch({ type: 'set-tags', tags }), [])
  const setComment = useCallback(
    (comment: string) => dispatch({ type: 'set-comment', comment }),
    []
  )

  const canSaveAdvancement = useMemo(() => {
    const bucketChanged = state.bucket != null && state.bucket !== advancement.bucket
    return bucketChanged || state.comment.trim().length > 0
  }, [advancement.bucket, state.bucket, state.comment])

  const canSaveTags = useMemo(() => {
    return !sameRepaymentTagSet(state.tags, currentTags) || state.comment.trim().length > 0
  }, [currentTags, state.comment, state.tags])

  return {
    ...state,
    canSaveAdvancement,
    canSaveTags,
    reset,
    setBucket,
    setComment,
    setTags,
    startAction,
    startAdvancement,
    startAssignment,
    startEmail,
    startEditNote,
    startNote,
    startRcs,
    startTags,
    startTodo
  }
}
