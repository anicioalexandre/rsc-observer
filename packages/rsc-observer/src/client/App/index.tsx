import { useEffect, useState } from "react";
import { ToggleButton } from "../components/ToggleButton";
import { Panel } from "../components/Panel";

const STORAGE_KEY = "__rsc_observer_open";

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOpen(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    // storage disabled or full; ignore
  }
}

// Keyboard shortcut: Cmd/Ctrl+Shift+O (Observer). Picks a binding that doesn't
// shadow the browser's built-ins (Ctrl+Shift+R is hard-refresh, Ctrl+Shift+I
// opens DevTools). Listens at the window level on the host page; the panel
// itself lives behind a closed shadow root so events still bubble up.
function isToggleShortcut(e: KeyboardEvent): boolean {
  if (!e.shiftKey) return false;
  if (!(e.ctrlKey || e.metaKey)) return false;
  // Use `code` so the binding survives keyboard layouts where "O" lives
  // somewhere other than KeyO.
  return e.code === "KeyO";
}

export function App() {
  const [open, setOpen] = useState(readOpen);

  useEffect(() => {
    writeOpen(open);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!isToggleShortcut(e)) return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <ToggleButton open={open} onToggle={() => setOpen((v) => !v)} />
      {open ? <Panel onClose={() => setOpen(false)} /> : null}
    </>
  );
}
