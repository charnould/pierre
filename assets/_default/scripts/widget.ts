//
//
// initial state
let pierre_is_open = false;
let configuration: string | undefined;

//
//
// After DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  //
  //
  // Set PIERRE stylesheet
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
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
`;
  document.head.appendChild(styleSheet);

  const el = document.getElementById("pierre-ia");
  //
  //
  // If PIERRE button exists
  if (el !== null) {
    //
    // Get configuration
    configuration = el.dataset.configuration;

    //
    // and create PIERRE modal if button is clicked
    el.addEventListener("click", () => {
      // If a click occurs:
      // create PIERE modal (wrapper + iframe)
      const wrapper = document.createElement("div");
      wrapper.id = "pierre-ia_wrapper";

      const subwrapper = document.createElement("div");
      subwrapper.id = "pierre-ia_subwrapper";

      const iframe = document.createElement("iframe");
      iframe.id = "pierre-ia_iframe";
      iframe.src = `https://assistant.pierre-ia.org?config=${configuration}`;

      const close = document.createElement("p");
      close.id = "pierre-ia_close";
      close.textContent = "✕";

      wrapper.appendChild(subwrapper);
      subwrapper.appendChild(close);
      subwrapper.appendChild(iframe);
      document.body.appendChild(wrapper);

      // Finally set PIERRE state
      pierre_is_open = true;
    });
  }
});

//
//
//
// CLOSE PIERRE MODAL
// Listen to Escape click to close modal
document.addEventListener("keydown", (event) => {
  if (pierre_is_open === true && event.key === "Escape") {
    const el = document.getElementById("pierre-ia_wrapper");
    if (el !== null) el.remove();
  }
});

// Listen to click outside of modal to close modal
document.addEventListener("click", (event) => {
  const el = document.getElementById("pierre-ia_wrapper");
  const target = event.target as HTMLElement;
  if (pierre_is_open === true && target && target.id !== "pierre-ia" && el !== null) {
    el.remove();
    pierre_is_open = false;
  }
});

// Listen to click outside of modal to close modal
document.addEventListener("touchstart", (event) => {
  const el = document.getElementById("pierre-ia_wrapper");
  const target = event.target as HTMLElement;
  if (pierre_is_open === true && target && target.id !== "pierre-ia" && el !== null) {
    el.remove();
    pierre_is_open = false;
  }
});
