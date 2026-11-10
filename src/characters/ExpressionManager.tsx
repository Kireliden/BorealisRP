import { useEffect, useState } from "react";
import { ArrowLeft, Check, FileImage, FolderOpen, Pencil, Save, Upload } from "lucide-react";
import { loadCharacters } from "./characters.storage";
import type { CharacterRecord } from "./characters.types";
import { CHARACTER_EXPRESSION_SLOTS, getCharacterExpressionBlob, listCharacterExpressions, saveReviewedCharacterExpressions, type CharacterExpressionKey } from "./characterExpressions.storage";
import { getWorkspaceCharacterExpressionBlob, listWorkspaceCharacterExpressions, saveWorkspaceReviewedCharacterExpressions } from "./workspaceCharacterExpressions.storage";
import { getResourceBlob } from "../resources/resources.storage";
import { getWorkspaceResourceBlob } from "../resources/workspaceResources.storage";
import type { ResourceRecord } from "../resources/resources.types";
import ResourceImagePicker from "../resources/ResourceImagePicker";
import "./expressionManager.css";

type Props = { onClose: () => void; characters?: CharacterRecord[]; workspacePath?: string | null };
type Slot = { key: CharacterExpressionKey; label: string; blob: Blob | null; url: string | null; fileName: string };
type Step = "welcome" | "templates" | "character" | "individual" | "sheet" | "review";
type VaultTarget = { kind: "individual" | "sheet" } | { kind: "slot"; key: CharacterExpressionKey };
const blank = (): Slot[] => CHARACTER_EXPRESSION_SLOTS.map(s => ({ ...s, blob: null, url: null, fileName: "" }));

export default function ExpressionManager({ onClose, characters: workspaceCharacters, workspacePath }: Props) {
 const characters = (workspaceCharacters ?? loadCharacters()).filter(c => c.name.trim());
 const [step,setStep] = useState<Step>("welcome");
 const [characterId,setCharacterId] = useState("");
 const [slots,setSlots] = useState<Slot[]>(blank);
 const [editing,setEditing] = useState<CharacterExpressionKey|null>(null);
 const [error,setError] = useState("");
 const [saved,setSaved] = useState(false);
 const [busy,setBusy] = useState(false);
 const [vaultTarget,setVaultTarget] = useState<VaultTarget|null>(null);
 const [loadingExpressions,setLoadingExpressions] = useState(false);
 useEffect(() => {
  let cancelled = false;
  const createdUrls: string[] = [];
  setSlots(blank());
  setSaved(false);
  setEditing(null);
  if (!characterId) { setLoadingExpressions(false); return; }
  setLoadingExpressions(true);
  setError("");
  void (async () => {
   try {
    const existing = workspacePath
     ? await listWorkspaceCharacterExpressions(workspacePath, characterId)
     : await listCharacterExpressions(characterId);
    const loaded = await Promise.all(CHARACTER_EXPRESSION_SLOTS.map(async (slot): Promise<Slot> => {
     const metadata = existing.find((item) => item.key === slot.key);
     if (!metadata) return { ...slot, blob: null, url: null, fileName: "" };
     const blob = workspacePath
      ? await getWorkspaceCharacterExpressionBlob(workspacePath, characterId, slot.key)
      : await getCharacterExpressionBlob(characterId, slot.key);
     if (!blob) return { ...slot, blob: null, url: null, fileName: "" };
     const url = URL.createObjectURL(blob);
     createdUrls.push(url);
     return { ...slot, blob, url, fileName: metadata.fileName };
    }));
    if (!cancelled) setSlots(loaded);
   } catch (reason) {
    if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
   } finally {
    if (!cancelled) setLoadingExpressions(false);
   }
  })();
  return () => {
   cancelled = true;
   for (const url of createdUrls) URL.revokeObjectURL(url);
  };
 }, [characterId, workspacePath]);
 const character = characters.find(c => c.id === characterId);
 const missing = slots.filter(s => !s.blob).length;
 function assign(files: FileList|File[]|null) {
  if (!files) return;
  const next = slots.map(s => ({...s}));
  Array.from(files).filter(f=>f.type.startsWith("image/")).forEach(file => {
   const stem=file.name.replace(/\.[^.]+$/,"").toLowerCase();
   const named=next.findIndex(s=>s.key===stem||s.label.toLowerCase()===stem);
   const i=named>=0?named:next.findIndex(s=>!s.blob);
   if(i<0)return;
   if(next[i].url)URL.revokeObjectURL(next[i].url!);
   next[i]={...next[i],blob:file,fileName:file.name,url:URL.createObjectURL(file)};
  });
  setSlots(next);setSaved(false);setError("");setStep("review");
 }
 async function split(file?:File) {
  if(!file)return;
  try {
   const url=URL.createObjectURL(file),img=new Image();img.src=url;await img.decode();
   const w=img.naturalWidth/3,h=img.naturalHeight/2;
   const next=await Promise.all(slots.map(async(s,i)=>{
    const c=document.createElement("canvas");c.width=Math.floor(w);c.height=Math.floor(h);
    const ctx=c.getContext("2d");if(!ctx)throw new Error("Could not crop the sheet.");
    ctx.drawImage(img,(i%3)*w,Math.floor(i/3)*h,w,h,0,0,c.width,c.height);
    const blob=await new Promise<Blob>((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("Could not create crop.")),"image/png"));
    return {...s,blob,fileName:s.key+".png",url:URL.createObjectURL(blob)};
   }));
   URL.revokeObjectURL(url);
   slots.forEach((slot)=>{ if (slot.url) URL.revokeObjectURL(slot.url); });
   setSlots(next);setSaved(false);setError("");setStep("review");
  } catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 async function chooseVaultResources(selected: ResourceRecord[]) {
  if (!vaultTarget || !selected.length) return;
  const files = await Promise.all(selected.map(async (resource) => {
   const blob = workspacePath
    ? await getWorkspaceResourceBlob(workspacePath, resource.id)
    : await getResourceBlob(resource.id);
   if (!blob) throw new Error(`"${resource.fileName}" is no longer available in Resources.`);
   return new File([blob], resource.fileName, { type: resource.mimeType || blob.type || "image/png" });
  }));
  if (vaultTarget.kind === "sheet") {
   await split(files[0]);
  } else if (vaultTarget.kind === "slot") {
   assignSingle(vaultTarget.key, files[0], slots, setSlots, setEditing);
   setSaved(false);
  } else {
   assign(files);
  }
  setVaultTarget(null);
 }
 async function save() {
  if(!characterId){setError("Choose a character before saving.");return;}
  setBusy(true);setError("");
  try {
   const reviewed = slots.filter((s): s is Slot&{blob:Blob}=>Boolean(s.blob)).map(s=>({key:s.key,image:s.blob,fileName:s.fileName}));
   if (workspacePath) await saveWorkspaceReviewedCharacterExpressions(workspacePath, characterId, reviewed);
   else await saveReviewedCharacterExpressions(characterId, reviewed);
   setSaved(true);
   window.dispatchEvent(new Event("brd-character-expressions-updated"));
  }
  catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 }
 const back=(to:Step)=><button className="expression-back" onClick={()=>setStep(to)}><ArrowLeft size={15}/> Back</button>;
 return <div className="expression-manager"><nav className="expression-steps"><button className="expression-back" onClick={onClose}><ArrowLeft size={15}/> Back to Resources</button><strong>✦ Expression Manager</strong><p>Character artwork tools</p>{(["welcome","templates","character","individual","sheet","review"] as Step[]).map((s,i)=><button className={step===s?"active":""} key={s} onClick={()=>setStep(s)}>{i+1}. {s==="welcome"?"Welcome":s==="templates"?"Templates":s==="character"?"Character":s==="individual"?"Individual files":s==="sheet"?"Expression sheet":"Review & save"}</button>)}</nav><main className="expression-main">
 {step==="welcome"&&<><small>BOREALIS · CHARACTER TOOLS</small><h1>Welcome to the Expression Manager</h1><p>What are you looking for?</p><div className="expression-choice-grid"><button onClick={()=>setStep("templates")}><FileImage/><b>Templates</b><span>Download guides for your artwork.</span></button><button onClick={()=>setStep("character")}><Upload/><b>Edit character expressions</b><span>Import, review and save six expressions.</span></button></div></>}
 {step==="templates"&&<>{back("welcome")}<h1>Expression templates</h1><p>Download a blank canvas for individual files or a six-cell sheet. Individual canvas: 512 × 640. Sheet: 1536 × 1280, 3 columns × 2 rows.</p><div className="expression-choice-grid"><button onClick={()=>downloadTemplate(false)}><FileImage/><b>Individual Template</b><span>Save a blank 512 × 640 canvas.</span></button><button onClick={()=>downloadTemplate(true)}><FileImage/><b>Sheet Template</b><span>Save a labelled 3 × 2 sheet.</span></button></div></>}
 {step==="character"&&<>{back("welcome")}<h1>Choose a character</h1><label className="expression-field">Character<select value={characterId} onChange={e=>setCharacterId(e.target.value)}><option value="">Select a character…</option>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="expression-choice-grid"><button disabled={!characterId||loadingExpressions} onClick={()=>setStep("individual")}><Upload/><b>Individual files</b><span>Import images and assign them in review.</span></button><button disabled={!characterId||loadingExpressions} onClick={()=>setStep("sheet")}><FileImage/><b>Expression sheet</b><span>Automatically crop a 3 × 2 sheet.</span></button></div></>}
 {step==="individual"&&<>{back("character")}<h1>Import individual expressions</h1><p>Names matching neutral, smile, smirk, angry, crying or flushed are assigned automatically; other files fill empty slots in order.</p>
 <div className="expression-source-options">
  <button type="button" className="expression-vault-button" onClick={()=>setVaultTarget({kind:"individual"})}><FolderOpen size={20}/><b>Choose from Resources</b><span>Browse images already in {workspacePath?"this workspace":"the global"} vault, including folders.</span></button>
  <label className="expression-upload"><Upload/><b>Upload from device</b><input type="file" accept="image/*" multiple onChange={e=>assign(e.target.files)}/></label>
 </div><button onClick={()=>setStep("review")}>Continue to review</button></>}
 {step==="sheet"&&<>{back("character")}<h1>Import expression sheet</h1><p>Uses three equal columns and two equal rows. Use the supplied template or matching proportions without gutters.</p>
 <div className="expression-source-options">
  <button type="button" className="expression-vault-button" onClick={()=>setVaultTarget({kind:"sheet"})}><FolderOpen size={20}/><b>Choose sheet from Resources</b><span>Use an existing image from the workspace vault.</span></button>
  <label className="expression-upload"><Upload/><b>Upload sheet from device</b><input type="file" accept="image/*" onChange={e=>void split(e.target.files?.[0])}/></label>
 </div></>}
 {step==="review"&&<>{back("character")}<h1>Review expressions</h1><p>{character?.name??"Choose a character"} · {loadingExpressions?"Loading saved expressions…":`${6-missing}/6 ready`}. Edit any image before saving.</p><div className="expression-review-grid">{slots.map(s=><article key={s.key} className="expression-review-card"><header><b>{s.label}</b><button onClick={()=>setEditing(editing===s.key?null:s.key)}><Pencil size={13}/> Edit</button></header><div className="expression-crop-preview">{s.url?<img src={s.url} alt={s.label}/>:<span><FileImage/> Image missing</span>}</div><small>{s.fileName||"No image assigned"}</small>{editing===s.key&&<div className="expression-replace-actions"><button type="button" onClick={()=>setVaultTarget({kind:"slot",key:s.key})}><FolderOpen size={13}/> From Resources</button><label>From device<input type="file" accept="image/*" onChange={e=>{assignSingle(s.key,e.target.files?.[0],slots,setSlots,setEditing);setSaved(false);}} /></label></div>}</article>)}</div><div className="expression-save-actions"><span>Imported originals remain untouched. Saving replaces this character's six expressions only after confirmation.</span><button disabled={busy||loadingExpressions||missing>0||!characterId} onClick={()=>{if(window.confirm("Save these expressions for "+(character?.name??"this character")+"? Existing expressions will be replaced."))void save();}}><Save size={15}/>{busy?"Saving…":"Save expressions"}</button>{saved&&<p><Check size={15}/> Saved all six expressions for {character?.name}.</p>}</div></>}
 {error&&<p role="alert">{error}</p>}</main>
 {vaultTarget&&<ResourceImagePicker
  workspacePath={workspacePath}
  multiple={vaultTarget.kind==="individual"}
  title={vaultTarget.kind==="sheet"?"Choose expression sheet from Resources":vaultTarget.kind==="slot"?`Replace ${CHARACTER_EXPRESSION_SLOTS.find(s=>s.key===vaultTarget.key)?.label??"expression"} from Resources`:"Choose expressions from Resources"}
  onCancel={()=>setVaultTarget(null)}
  onChoose={chooseVaultResources}
 />}
 </div>;
}
function assignSingle(key:CharacterExpressionKey,file:File|undefined,slots:Slot[],setSlots:(v:Slot[])=>void,setEditing:(v:CharacterExpressionKey|null)=>void){if(!file||!file.type.startsWith("image/"))return;setSlots(slots.map(s=>{if(s.key!==key)return s;if(s.url)URL.revokeObjectURL(s.url);return {...s,blob:file,fileName:file.name,url:URL.createObjectURL(file)};}));setEditing(null);}
function downloadTemplate(sheet:boolean){const w=sheet?1536:512,h=sheet?1280:640;const labels=CHARACTER_EXPRESSION_SLOTS.map((s,i)=>'<g transform="translate('+(sheet?(i%3)*512:0)+','+(sheet?Math.floor(i/3)*640:0)+')"><rect width="512" height="640" fill="#292b3b" stroke="#b4befe" stroke-width="4"/><text x="256" y="320" fill="#cdd6f4" font-size="28" text-anchor="middle">'+(sheet?s.label:"Draw expression here")+'</text></g>').join("");const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'">'+labels+'</svg>';const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));const a=document.createElement("a");a.href=url;a.download=sheet?"BRD-Expression-Sheet-Template.svg":"BRD-Individual-Expression-Template.svg";a.click();URL.revokeObjectURL(url);}
