var T = function () {
    return document.querySelector('[data-role="system__logo"]').cloneNode(!0)
  },
  V = function () {
    const q = document.getElementsByTagName('a')
    for (let j = 0; j < q.length; j++) if (j.id !== 'footprint__link') q[j].target = '_blank'
  },
  K = function () {
    const q = document.querySelector('main')
    q.scrollTop = q.scrollHeight
  },
  L = function () {
    const q = document.getElementById('prompt__input'),
      j = q.value
    return (q.value = ''), j
  },
  W = function (q) {
    const j = document.querySelector('[data-role="system__loading"]')
    if (j) j.remove()
    const z = document.querySelector('main > div:last-child'),
      x = q.replace(/<br\/>/g, '\n\n').replace(/\n{3,}/g, '\n\n')
    ;(z.innerHTML = marked.parse(x)), V(), K()
    return
  },
  F = function (q) {
    document.getElementById('prompt__submit').disabled = !0
    const j = document.getElementsByTagName('button'),
      z = Array.from(j)
    for (let B of z) B.disabled = !0
    const x = window.location.pathname,
      C = x.startsWith('/') ? x.substring(3) : x,
      M = new URL(window.location.href),
      N = new URLSearchParams(M.search).get('config'),
      O = `/ai/${C}?message=${q}&config=${N}`,
      D = new EventSource(O)
    let J = ''
    ;(D.onmessage = (B) => {
      if (B.data !== 'pierre_event_stream_closed') (J += B.data), W(J)
      else {
        D.close(), (document.getElementById('prompt__submit').disabled = !1)
        for (let P of z) P.disabled = !1
      }
    }),
      (D.onerror = (B) => {
        console.log(B)
      })
  },
  H = function (q) {
    const j = document.querySelector('main'),
      z = document.createElement('div')
    z.setAttribute('data-role', 'user'), (z.textContent = q), j.appendChild(z)
    const x = document.createElement('div')
    x.setAttribute('data-role', 'system'), j.appendChild(T())
    const C = document.createElement('div')
    C.setAttribute('data-role', 'system__loading'), x.appendChild(C), j.appendChild(x), K()
  },
  Q = document.getElementsByTagName('button'),
  R = Array.from(Q)
for (let q of R)
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
