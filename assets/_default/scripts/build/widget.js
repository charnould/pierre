let x = !1
let D
document.addEventListener('DOMContentLoaded', () => {
  const j = document.createElement('style')
  ;(j.type = 'text/css'),
    (j.innerText = `
#pierre-ia {
  margin: 0;
  z-index: 9990;
  cursor: pointer;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Oxygen, Open Sans, sans-serif;
  transition: transform 0.35s;
  position: fixed;
}

#pierre-ia:hover { transform: scale(1.15); }

#pierre-ia_wrapper {
  -webkit-backdrop-filter: blur();
  backdrop-filter: blur();
  z-index: 9998;
  background-color: rgba(25, 29, 68, 0.1);
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  animation: 0.5s forwards blur;
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
}

#pierre-ia_subwrapper { position: relative; }

#pierre-ia_iframe {
  z-index: 9990;
  opacity: 0;
  border: none;
  border-radius: 10px;
  width: 600px;
  height: 700px;
  animation: 1s forwards fadeIn;
  box-shadow:
    0 0 0 1px rgba(15, 33, 50, 0.05),
    0 0.1em 2.8em -0.8em rgba(15, 33, 50, 0.1),
    0 0.2em 3.2em -1.2em rgba(15, 33, 50, 0.2),
    0 0.4em 2em -1.2em rgba(15, 33, 50, 0.3),
    0 0.6em 2.4em -1.6em rgba(15, 33, 50, 0.4),
    0 0.8em 2.8em -2em rgba(15, 33, 50, 0.5);
}

#pierre-ia_close {
  cursor: pointer;
  z-index: 9999;
  display: none;
  position: absolute;
  top: 14px;
  right: 14px;
}

@media (max-width: 600px) {
  #pierre-ia_iframe {
    box-shadow: none;
    border-radius: 0;
    width: 100dvw;
    height: 100dvh;
  }

  #pierre-ia_close { display: block; }
}

@keyframes fadeIn {
  from  { opacity: 0; }
  to    { opacity: 1; }
}

@keyframes blur {
  from  { -webkit-backdrop-filter: blur(); backdrop-filter: blur(); }
  to    { -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
}

`),
    document.head.appendChild(j)
  const z = document.getElementById('pierre-ia')
  if (z !== null)
    (D = z.dataset.configuration),
      z.addEventListener('click', (E) => {
        const A = document.createElement('div')
        A.id = 'pierre-ia_wrapper'
        const q = document.createElement('div')
        q.id = 'pierre-ia_subwrapper'
        const B = document.createElement('iframe')
        ;(B.id = 'pierre-ia_iframe'), (B.src = `/?config=${D}`)
        const C = document.createElement('p')
        ;(C.id = 'pierre-ia_close'),
          (C.textContent = '\u2715'),
          A.appendChild(q),
          q.appendChild(C),
          q.appendChild(B),
          document.body.appendChild(A),
          (x = !0)
      })
})
document.addEventListener('keydown', (j) => {
  if (x === !0 && j.key === 'Escape') document.getElementById('pierre-ia_wrapper').remove()
})
document.addEventListener('click', (j) => {
  if (x === !0 && j.target.id !== 'pierre-ia' && document.getElementById('pierre-ia_wrapper') !== null)
    document.getElementById('pierre-ia_wrapper').remove()
})
document.addEventListener('touchstart', (j) => {
  if (x === !0 && j.target.id !== 'pierre-ia' && document.getElementById('pierre-ia_wrapper') !== null)
    document.getElementById('pierre-ia_wrapper').remove()
})
