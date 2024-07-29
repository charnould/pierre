// Select all <dd> elements
const ddElements = document.getElementsByTagName("button");

// Convert the HTMLCollection to an array for easier handling
const ddArray = Array.from(ddElements);

// Add an event listener to each <dd> element
for (const dd of ddArray) {
  dd.addEventListener("click", (event) => {
    // Get the inner text of the clicked <dd> element
    update_ui(event.target.innerText);
    get_ai_answer(event.target.innerText);
  });
}

document.getElementById("prompt__input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const prompt = capture_prompt();
    if (prompt !== "") {
      update_ui(prompt);
      get_ai_answer(prompt);
    }
  }
});

document.getElementById("prompt__submit").addEventListener("click", (event) => {
  event.preventDefault();
  const prompt = capture_prompt();
  if (prompt !== "") {
    update_ui(prompt);
    get_ai_answer(prompt);
  }
});

//
//
//
// Util functions
//
//
//

//
// Add < target = "_blank" > to all links
function clone_system_logo() {
  const firstAssistantElement = document.querySelector('[data-role="system__logo"]');
  const clonedElement = firstAssistantElement.cloneNode(true); // true to clone the element with its children
  return clonedElement;
}

//
// Add < target = "_blank" > to all links
function add_blank_target_to_links() {
  const links = document.getElementsByTagName("a");
  for (let l = 0; l < links.length; l++) {
    if (l.id !== "footprint__link") links[l].target = "_blank";
  }
}

//
// Auto scroll to <div id="conversation"> bottom
function scroll_to_bottom() {
  const container = document.querySelector("main");
  container.scrollTop = container.scrollHeight;
}

//
// Get 'live' user prompt value
function capture_prompt() {
  const el = document.getElementById("prompt__input");
  const prompt = el.value;
  el.value = "";
  return prompt;
}

//
// Write in UI PIERRE answser
function update_ui_with_ai(message) {
  // Select the element with the class "loading"
  // Remove the "loading" element if it exists
  const loadingElement = document.querySelector('[data-role="system__loading"]');
  if (loadingElement) loadingElement.remove();

  // Select the parent element where you want to append new elements
  const parentElement = document.querySelector("main > div:last-child");
  const clean_message = message.replace(/<br\/>/g, "\n\n").replace(/\n{3,}/g, "\n\n");

  parentElement.innerHTML = marked.parse(clean_message);

  add_blank_target_to_links();
  scroll_to_bottom();
  return;
}

//
// Get ai answer from PIERRE
function get_ai_answer(prompt) {
  document.getElementById("prompt__submit").disabled = true;

  const ddElements = document.getElementsByTagName("button");
  const ddArray = Array.from(ddElements);
  for (const dd of ddArray) dd.disabled = true;

  const pathname = window.location.pathname;
  const pathSegment = pathname.startsWith("/") ? pathname.substring(3) : pathname;

  // Get the full URL
  const url2 = new URL(window.location.href);
  // Create a URLSearchParams object
  const params = new URLSearchParams(url2.search);
  // Get a specific parameter by name
  const config = params.get("config");

  const url = `/ai/${pathSegment}?message=${prompt}&config=${config}`;

  const eventSource = new EventSource(url);
  let message = "";

  eventSource.onmessage = (event) => {
    if (event.data !== "pierre_event_stream_closed") {
      message += event.data;
      update_ui_with_ai(message);
    } else {
      eventSource.close();
      document.getElementById("prompt__submit").disabled = false;
      for (const dd of ddArray) dd.disabled = false;
    }
  };

  eventSource.onerror = (event) => {
    console.log(event);
  };
}

//
// Update UI
function update_ui(message) {
  const main = document.querySelector("main");

  const user_p = document.createElement("div");
  user_p.setAttribute("data-role", "user");
  user_p.textContent = message;
  main.appendChild(user_p);

  const bot_p = document.createElement("div");
  bot_p.setAttribute("data-role", "system");

  main.appendChild(clone_system_logo());

  const p = document.createElement("div");
  p.setAttribute("data-role", "system__loading");

  bot_p.appendChild(p);
  main.appendChild(bot_p);

  scroll_to_bottom();
}
