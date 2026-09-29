import { Check } from "lucide-react";

const STEPS = ["Document", "Photo", "Frame & check", "Print or upload"];

/** Where the person is: pick a document, add a photo, frame and check it, then download. */
export function StepsRail({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="steps" aria-label="Steps">
      {STEPS.map((label, index) => {
        const n = index + 1;
        const state = n < current ? "done" : n === current ? "now" : "todo";
        return (
          <li
            key={label}
            className={`step ${state}`}
            aria-current={state === "now" ? "step" : undefined}
          >
            <i aria-hidden="true">{state === "done" ? <Check size={13} strokeWidth={2.5} /> : n}</i>
            <span>{label}</span>
            {state === "now" && <span className="step-of">{n} of {STEPS.length}</span>}
            {state === "done" && <span className="visually-hidden"> (done)</span>}
          </li>
        );
      })}
    </ol>
  );
}
