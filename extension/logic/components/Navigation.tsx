export function Navigation({
  showBack = false,
  onBack
}: {
  showBack?: boolean
  onBack?: () => void
}) {
  return (
    <div className="flex cursor-pointer items-center justify-between p-4 pb-0">
      {showBack ? (
        <svg
          onClick={onBack}
          xmlns="http://www.w3.org/2000/svg"
          className="size-7 fill-white"
          viewBox="0 0 24 24"
        >
          <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m1.999-6.563L10.68 12L14 8.562L12.953 7.5L9.29 11.277a1.045 1.045 0 0 0 0 1.446l3.663 3.777z" />
        </svg>
      ) : (
        <p className="font-base ml-2 text-sm">ACTIONS</p>
      )}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        // onClick={handleClose}
        className="size-7 fill-white"
        viewBox="0 0 24 24"
      >
        <path d="m13.06 12l3.006-3.005l-1.06-1.06L12 10.938L8.995 7.934l-1.06 1.06L10.938 12l-3.005 3.005l1.06 1.06L12 13.062l3.005 3.005l1.06-1.06L13.062 12zM12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10" />
      </svg>
    </div>
  )
}
