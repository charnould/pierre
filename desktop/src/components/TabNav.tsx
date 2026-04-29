interface Props {
  isLoggedIn: boolean
  onSettingsClick: () => void
}

export function TitleBar({ isLoggedIn, onSettingsClick }: Props) {
  return (
    <div className="drag flex h-10 shrink-0 items-center border-b border-gray-300 bg-gray-50 pr-3">
      <div className="flex-1" />
      {isLoggedIn ? (
        <button
          onClick={onSettingsClick}
          className="no-drag flex items-center gap-1.5 px-3 py-1 text-[12px] text-gray-500 hover:text-gray-800"
        >
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Connecté
        </button>
      ) : (
        <span className="flex items-center gap-1.5 px-3 py-1 text-[12px] text-gray-400">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Non connecté
        </span>
      )}
    </div>
  )
}
