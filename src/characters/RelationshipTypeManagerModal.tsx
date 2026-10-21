import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { RelationshipKind } from "./characters.types";

type Props = {
  relationshipKinds: RelationshipKind[];
  usageCounts: Record<string, number>;
  onClose: () => void;
  onSave: (nextKinds: RelationshipKind[], renames: { from: string; to: string }[]) => void;
};

export default function RelationshipTypeManagerModal({ relationshipKinds, usageCounts, onClose, onSave }: Props) {
  const [types, setTypes] = useState<RelationshipKind[]>(relationshipKinds);
  const [originalTypes] = useState<RelationshipKind[]>(relationshipKinds);
  const [newType, setNewType] = useState("");
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");
  const [renamedTypes, setRenamedTypes] = useState<Record<string, string>>({});

  function isDuplicate(value: string, except?: string) {
    return types.some((type) => type !== except && type.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase());
  }
  function addType() {
    const value = newType.trim();
    if (!value) return;
    if (isDuplicate(value)) { setError("That relationship type already exists."); return; }
    setTypes((current) => [...current, value]);
    setNewType("");
    setError("");
  }
  function startEdit(type: string) { setEditingType(type); setEditValue(type); setError(""); }
  function commitEdit(type: string) {
    const value = editValue.trim();
    if (!value) { setError("A relationship type cannot be empty."); return; }
    if (isDuplicate(value, type)) { setError("That relationship type already exists."); return; }
    const original = Object.entries(renamedTypes).find(([, renamed]) => renamed === type)?.[0] ?? type;
    if (originalTypes.includes(original)) setRenamedTypes((current) => ({ ...current, [original]: value }));
    setTypes((current) => current.map((item) => item === type ? value : item));
    setEditingType(null);
    setError("");
  }
  function removeType(type: string) {
    const count = usageCounts[type] ?? 0;
    const warning = count
      ? `“${type}” is used by ${count} relationship(s). Removing it from the type list will not delete those relationships, but they will keep the old label until you change them. Continue?`
      : `Delete the relationship type “${type}”?`;
    if (!window.confirm(warning)) return;
    setTypes((current) => current.filter((item) => item !== type));
    setRenamedTypes((current) => Object.fromEntries(Object.entries(current).filter(([from, to]) => from !== type && to !== type)));
    if (editingType === type) setEditingType(null);
    setError("");
  }
  function save() {
    const renames = Object.entries(renamedTypes).filter(([from, to]) => types.includes(to) && from !== to).map(([from, to]) => ({ from, to }));
    onSave(types, renames);
  }

  return <div className="relationship-type-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="relationship-type-modal" role="dialog" aria-modal="true" aria-labelledby="relationship-type-title">
      <header className="relationship-type-header"><div><span>BOREALIS ROLEPLAY DEN · SETTINGS</span><h2 id="relationship-type-title">Relationship types</h2><p>Manage the labels available in every character profile and the Relationship Map.</p></div><button className="relationship-type-icon-button" type="button" onClick={onClose} aria-label="Close relationship type manager"><X size={18}/></button></header>
      <div className="relationship-type-list">
        {types.map((type) => <div className="relationship-type-row" key={type}>
          {editingType === type ? <><input autoFocus value={editValue} onChange={(event) => setEditValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") commitEdit(type); if (event.key === "Escape") setEditingType(null); }} aria-label={`Rename ${type}`}/><button type="button" className="relationship-type-action is-primary" onClick={() => commitEdit(type)} aria-label="Save name"><Check size={15}/></button><button type="button" className="relationship-type-action" onClick={() => setEditingType(null)} aria-label="Cancel rename"><X size={15}/></button></>
          : <><div className="relationship-type-name"><strong>{type}</strong><small>{usageCounts[type] ?? 0} {(usageCounts[type] ?? 0) === 1 ? "relationship" : "relationships"}</small></div><button type="button" className="relationship-type-action" onClick={() => startEdit(type)} aria-label={`Edit ${type}`}><Pencil size={14}/></button><button type="button" className="relationship-type-action is-danger" onClick={() => removeType(type)} aria-label={`Delete ${type}`}><Trash2 size={14}/></button></>}
        </div>)}
        {types.length === 0 && <p className="relationship-type-empty">No relationship types yet. Add one below to get started.</p>}
      </div>
      <form className="relationship-type-add" onSubmit={(event) => { event.preventDefault(); addType(); }}><input value={newType} onChange={(event) => { setNewType(event.target.value); setError(""); }} placeholder="e.g. Symbiotic, Rivals, Mentor…" aria-label="New relationship type"/><button type="submit" disabled={!newType.trim() || isDuplicate(newType)}><Plus size={15}/> Add type</button></form>
      {error && <p className="relationship-type-error" role="alert">{error}</p>}
      <p className="relationship-type-footnote">Renaming a type updates existing links. Deleting a type only removes it from the available list; existing relationships are kept.</p>
      <footer className="relationship-type-footer"><button type="button" className="relationship-type-secondary" onClick={onClose}>Cancel</button><button type="button" className="relationship-type-save" onClick={save}>Save changes</button></footer>
    </section>
  </div>;
}
