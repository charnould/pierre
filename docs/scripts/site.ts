import mediumZoom from "medium-zoom";

const zoom = mediumZoom("[data-zoomable]", { background: "#fff", margin: 24 });
zoom.on("open", () => document.body.classList.add("is-zooming"));
zoom.on("closed", () => document.body.classList.remove("is-zooming"));
