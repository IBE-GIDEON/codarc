// Runs before paint so the page never flashes the wrong theme.
// Notion treats light/dark/system as an explicit setting, so we persist a
// choice and only fall back to the OS when the user hasn't picked one.
const script = `
(function () {
  try {
    var stored = localStorage.getItem("codarc-theme");
    var isDark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
