// Initial state of PIERRE modal
var pierre_is_open = false;

// On DOM load: retrieve configuration
// (e.g. actionlogement.fr, arpej.fr)
var configuration;
document.addEventListener("DOMContentLoaded", () => {
  configuration = document.getElementById("pierre-ai").dataset.configuration;
});

//
//
//
// OPEN PIERRE MODAL
// Afterwards, listen to any click on PIERRE button
document.getElementById("pierre-ai").addEventListener("click", (event) => {
  // If a click occurs:
  // create PIERE modal (wrapper + iframe)
  var container = document.createElement("div");
  container.id = "pierre-ai_wrapper";

  var iframe = document.createElement("iframe");
  iframe.id = "pierre-ai_iframe";
  iframe.src = "https://pierre-ai.org?config=" + configuration;

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Finally set PIERRE state
  pierre_is_open = true;
});

//
//
//
// CLOSE PIERRE MODAL
// Listen to Escape click to close modal
document.addEventListener("keydown", (event) => {
  if (pierre_is_open === true && event.key === "Escape") {
    document.getElementById("pierre-ai_wrapper").remove();
  }
});

// Listen to click outside of modal to close modal
document.addEventListener("click", (event) => {
  if (
    pierre_is_open === true &&
    event.target.id !== "pierre-ai" &&
    document.getElementById("pierre-ai_wrapper") !== null
  ) {
    document.getElementById("pierre-ai_wrapper").remove();
  }
});
