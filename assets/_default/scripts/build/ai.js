const T = () => document.querySelector('[data-role="system__logo"]').cloneNode(!0)
const V = () => {
  const q = document.getElementsByTagName('a')
  for (let j = 0; j < q.length; j++) if (j.id !== 'footprint__link') q[j].target = '_blank'
}
const K = () => {
  const q = document.querySelector('main')
  q.scrollTop = q.scrollHeight
}
const L = () => {
  const q = document.getElementById('prompt__input')
  const j = q.value
  return (q.value = ''), j
}
const W = (q) => {
  const j = document.querySelector('[data-role="system__loading"]')
  if (j) j.remove()
  const z = document.querySelector('main > div:last-child')
  const x = q.replace(/<br\/>/g, '\n\n').replace(/\n{3,}/g, '\n\n')
  ;(z.innerHTML = marked.parse(x)), V(), K()
  return
}
const F = (q) => {
  document.getElementById('prompt__submit').disabled = !0
  const j = document.getElementsByTagName('button')
  const z = Array.from(j)
  for (const B of z) B.disabled = !0
  const x = window.location.pathname
  const C = x.startsWith('/') ? x.substring(3) : x
  const M = new URL(window.location.href)
  const N = new URLSearchParams(M.search).get('config')
  const O = `/ai/${C}?message=${q}&config=${N}`
  const D = new EventSource(O)
  let J = ''
  ;(D.onmessage = (B) => {
    if (B.data !== 'pierre_event_stream_closed') (J += B.data), W(J)
    else {
      D.close(), (document.getElementById('prompt__submit').disabled = !1)
      for (const P of z) P.disabled = !1
    }
  }),
    (D.onerror = (B) => {
      console.log(B)
    })
}
const H = (q) => {
  const j = document.querySelector('main')
  const z = document.createElement('div')
  z.setAttribute('data-role', 'user'), (z.textContent = q), j.appendChild(z)
  const x = document.createElement('div')
  x.setAttribute('data-role', 'system'), j.appendChild(T())
  const C = document.createElement('div')
  C.setAttribute('data-role', 'system__loading'), x.appendChild(C), j.appendChild(x), K()
}
const Q = document.getElementsByTagName('button')
const R = Array.from(Q)
for (const q of R)
  q.addEventListener('click', (j) => {
    H(j.target.innerText), F(j.target.innerText)
  })
document.getElementById('prompt__input').addEventListener('keydown', (q) => {
  if (q.key === 'Enter') {
    q.preventDefault()
    const j = L()
    if (j !== '') H(j), F(j)
  }
})
document.getElementById('prompt__submit').addEventListener('click', (q) => {
  q.preventDefault()
  const j = L()
  if (j !== '') H(j), F(j)
})
