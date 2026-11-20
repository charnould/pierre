export type IpcApiError = {
  error: {
    code?: string
    message: string
  }
}

export type IpcDataResult<T> = { data: T } | IpcApiError | null

export type BinaryDownloadResult = { saved: true } | { canceled: true } | IpcApiError
