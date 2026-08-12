import { decodeEventsBase64 } from "./codec";
import { createApp } from "./ui";

declare global {
  interface Window {
    __EVENTS_B64__?: string;
    __BUILD_YMD__?: number;
  }
}

function showFatal(message: string) {
  const root = document.getElementById("app");
  if (!root) return;
  root.replaceChildren();
  const box = document.createElement("div");
  box.className = "fatal-error";
  const title = document.createElement("h1");
  title.textContent = "Unable to load races";
  const body = document.createElement("p");
  body.textContent = message;
  box.append(title, body);
  root.append(box);
}

function boot() {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root");
  }

  const payload = window.__EVENTS_B64__;
  if (!payload) {
    showFatal("Embedded event data is missing from this build.");
    return;
  }

  try {
    const { events, buildYmd } = decodeEventsBase64(payload);
    try {
      createApp(root, events, window.__BUILD_YMD__ ?? buildYmd);
    } catch (error) {
      console.error(error);
      showFatal("Unable to start the race list.");
    }
  } catch (error) {
    console.error(error);
    showFatal("The embedded event payload could not be decoded.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
