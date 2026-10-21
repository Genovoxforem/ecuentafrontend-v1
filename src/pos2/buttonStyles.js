// Primary action colour for the POS V2 screens. Written as explicit hex values on purpose: the app-wide
// theme CSS (index.css) force-recolours every `bg-blue-600` button to its own teal, so the standard
// blue / darker-on-hover / pressed / keyboard-focus states below would never show with that class.
export const PRIMARY_BTN =
    "bg-[#3b82f6] text-white transition-colors duration-150 hover:bg-[#2f6fe4] active:bg-[#2563eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900";

// Same colour for a selected pill / chip.
export const PRIMARY_ACTIVE = "border-[#3b82f6] bg-[#3b82f6] text-white hover:bg-[#2f6fe4]";
