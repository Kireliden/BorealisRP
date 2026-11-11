# Borealis UI primitives

Use these app-owned controls for new UI. The visual style is driven by the active `--ctp-*`, `--accent`, `--surface` and `--border` variables.

## Dropdowns: `AppSelect`

`AppSelect.tsx` replaces native HTML `<select>` menus so the popup is rendered by BRS, not the browser/OS. It accepts the usual controlled `value`, `onChange={(event) => event.target.value}`, `disabled`, `id`, `className`, and `aria-label`, plus regular `<option>` children (which are interpreted rather than rendered to DOM).

The dropdown opens in a body portal so parent modals and scroll containers cannot clip it. It supports pointer, arrow keys, Home/End, Enter, typeahead, Escape, outside-click/focus dismissal and fixed viewport positioning. **Do not add new HTML `<select>` elements** to the interface without explicit justification.

## Confirmations, notices, renaming: `useAppDialog`

`AppDialogProvider` is mounted globally in `src/main.tsx`. From a component:

```tsx
const { confirm, prompt, alert } = useAppDialog();
if (await confirm("Delete this item?", {
  title: "Delete item", confirmLabel: "Delete", destructive: true,
})) {
  // perform deletion
}
const name = await prompt("Choose a new name.", existingName, { title: "Rename" });
// name is null if cancelled
await alert("This image was not supported.", { title: "Import failed" });
```

Requests queue, use theme colours, and restore focus. Avoid browser `window.alert`, `window.confirm`, and `window.prompt` in BRS.

## Colours: `AppColorPicker`

`AppColorPicker.tsx` replaces `input type="color"` with a palette, HSL controls and hexadecimal editing. It accepts controlled `value` or uncontrolled `defaultValue`, and an `onChange` callback with `event.target.value`.

## Exceptions

**OS file pickers** (`@tauri-apps/plugin-dialog`, `input type="file"`) deliberately remain native. File access permissions and system file integrations belong to the operating system. Existing app-rendered contextual menus, dialogs and popovers do not need replacing.

## Verification

Run `npm run build` and interactively test controls in Tauri on Windows/WebView2 and Linux/WebKitGTK, including focus/Escape, scroll, responsive placement, all light/dark themes, composer text selection and high-density menus.
