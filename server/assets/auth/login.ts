const form = document.querySelector<HTMLFormElement>('#login-form')
const error = document.querySelector<HTMLElement>('#login-error')
const submit = document.querySelector<HTMLButtonElement>('#login-submit')

if (form && error && submit) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!form.reportValidity()) return

    error.classList.add('hidden')
    error.textContent = ''
    submit.disabled = true
    submit.setAttribute('aria-busy', 'true')

    const data = new FormData(form)
    try {
      const response = await fetch('/auth/sign-in/email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? '')
        })
      })
      if (!response.ok) throw new Error('invalid_credentials')
      window.location.assign(form.dataset.redirect ?? '/c?config=default&data=')
    } catch {
      error.textContent = 'Email ou mot de passe incorrect.'
      error.classList.remove('hidden')
    } finally {
      submit.disabled = false
      submit.removeAttribute('aria-busy')
    }
  })
}
