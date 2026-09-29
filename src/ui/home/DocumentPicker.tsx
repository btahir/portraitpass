import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Search } from "lucide-react";
import {
  DOCUMENTS,
  getDocumentById,
  popularDocuments,
  searchDocuments,
  type DocumentSpec,
} from "../../core/index";
import { chipSize, keySize, notDiy } from "./docInfo";
import "./home.css";

export const NOT_DIY_TAG = "Can’t be made at home";

export interface DocumentPickerProps {
  /** Selected document id. */
  value?: string;
  onChange(docId: string): void;
  /** Studio sidebar variant: no chips, results listed in flow, two-line rows. */
  compact?: boolean;
}

/**
 * Document search: a combobox (ARIA 1.2 list pattern) over DOCUMENTS, with
 * popular chips underneath in the full variant.
 */
export function DocumentPicker({ value, onChange, compact = false }: DocumentPickerProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-opt-${i}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = value ? getDocumentById(value) : undefined;
  /** null: show the selected document's name; string: the user is typing. */
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const popular = useMemo(() => popularDocuments(), []);
  const typed = (query ?? "").trim();
  const results: DocumentSpec[] = useMemo(
    () => (typed ? searchDocuments(typed, compact ? 6 : 8) : compact && open ? popular : []),
    [typed, compact, open, popular],
  );
  const expanded = open && results.length > 0;
  const showEmpty = open && typed.length > 0 && results.length === 0;

  useEffect(() => {
    setActive(0);
  }, [typed]);
  useEffect(() => {
    if (!expanded) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[id="${optId(active)}"]`)
      ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, expanded]);

  const choose = (doc: DocumentSpec) => {
    setQuery(null);
    setOpen(false);
    onChange(doc.id);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = results.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else if (last >= 0) setActive((i) => (i >= last ? 0 : i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open && last >= 0) setActive((i) => (i <= 0 ? last : i - 1));
        break;
      case "Home":
        if (expanded) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (expanded) {
          event.preventDefault();
          setActive(last);
        }
        break;
      case "Enter":
        if (expanded && results[active]) {
          event.preventDefault();
          choose(results[active]);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else if (query !== null) {
          event.preventDefault();
          setQuery(null);
        }
        break;
      case "Tab":
        setOpen(false);
        setQuery(null);
        break;
    }
  };

  return (
    <div
      className={`dp${compact ? " dp--compact" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery(null);
        }
      }}
    >
      <div className="dp-field">
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Document or country"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded ? optId(active) : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={compact ? "Search documents" : "Search country or document"}
          value={query ?? selected?.name ?? ""}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={(event) => {
            if (query === null && selected) event.currentTarget.select();
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Matching documents"
        className="dp-list"
        hidden={!expanded}
      >
        {results.map((doc, i) => (
          <li
            key={doc.id}
            id={optId(i)}
            role="option"
            aria-selected={i === active}
            className={`dp-opt${i === active ? " is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => i !== active && setActive(i)}
            onClick={() => choose(doc)}
          >
            <span className="dp-name">{doc.name}</span>
            {notDiy(doc) && <span className="dp-tag">{NOT_DIY_TAG}</span>}
            <span className="dp-meta">
              {doc.country} · {keySize(doc)}
            </span>
          </li>
        ))}
      </ul>
      {showEmpty && (
        <p className="dp-empty">
          No match for “{typed}”. Try a country, or a document like “visa”.{" "}
          <a href="/documents/">Browse all {DOCUMENTS.length} documents</a>
        </p>
      )}
      <p className="dp-sr" role="status" aria-live="polite">
        {open && typed
          ? results.length
            ? `${results.length} ${results.length === 1 ? "document" : "documents"} found. Use the up and down arrow keys, then Enter.`
            : "No documents found."
          : ""}
      </p>
      {!compact && (
        <div className="dp-chips" role="group" aria-label="Popular documents">
          {popular.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className="dp-chip"
              aria-pressed={value === doc.id}
              onClick={() => {
                setQuery(null);
                setOpen(false);
                onChange(doc.id);
              }}
            >
              {doc.name}
              <small>{chipSize(doc)}</small>
            </button>
          ))}
          <a className="dp-chip dp-chip--link" href="/documents/">
            All {DOCUMENTS.length}
          </a>
        </div>
      )}
    </div>
  );
}
