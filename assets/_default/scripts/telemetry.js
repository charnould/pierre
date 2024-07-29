Turbo.setFormMode("on");
document.addEventListener("DOMContentLoaded", () => {
  //document.addEventListener('turbo:load', () => {
  console.log("DOM fully loaded and parsed");
  const c = document.getElementById("conversation");
  //const clean_message = message.replace(/<br\/>/g, '\n\n').replace(/\n{3,}/g, '\n\n')
  c.innerHTML = marked.parse(c.innerHTML);
});
