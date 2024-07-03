// Initial state of PIERRE modal
let pierre_is_open = false;

// On DOM load: retrieve configuration
// (e.g. actionlogement.fr, arpej.fr)
let configuration: string | undefined;

// On DOM load
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("pierre-ia");
  if (el !== null) {
    configuration = el.dataset.configuration;

    //
    //
    //
    // OPEN PIERRE MODAL
    // Afterwards, listen to any click on PIERRE button
    el.addEventListener("click", (event) => {
      // If a click occurs:
      // create PIERE modal (wrapper + iframe)
      var wrapper = document.createElement("div");
      wrapper.id = "pierre-ia_wrapper";

      var subwrapper = document.createElement("div");
      subwrapper.id = "pierre-ia_subwrapper";

      var iframe = document.createElement("iframe");
      iframe.id = "pierre-ia_iframe";
      iframe.src = "https://assistant.pierre-ia.org?config=" + configuration;

      var close = document.createElement("p");
      close.id = "pierre-ia_close";
      close.textContent = "✕";
      close.style.backgroundColor = "#c5c5c5";
      close.style.padding = "4px 8px";
      close.style.borderRadius = "6px";

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
    document.getElementById("pierre-ia_wrapper").remove();
  }
});

// Listen to click outside of modal to close modal
document.addEventListener("click", (event) => {
  if (
    pierre_is_open === true &&
    event.target.id !== "pierre-ia" &&
    document.getElementById("pierre-ia_wrapper") !== null
  ) {
    document.getElementById("pierre-ia_wrapper").remove();
  }
});

// Listen to click outside of modal to close modal
document.addEventListener("touchstart", (event) => {
  if (
    pierre_is_open === true &&
    event.target.id !== "pierre-ia" &&
    document.getElementById("pierre-ia_wrapper") !== null
  ) {
    document.getElementById("pierre-ia_wrapper").remove();
  }
});
