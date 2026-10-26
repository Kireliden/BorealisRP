import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Tag, X, GitFork, LayoutGrid, Sparkles } from "lucide-react";
import { loadCharacters, saveCharacters } from "./characters.storage";
import { characterAccentColor, createEmptyCharacterDraft, makeCharacterRecord, type CharacterDraft, type CharacterRecord } from "./characters.types";
import CharacterEditorModal from "./CharacterEditorModal";
import " ./characters.css";