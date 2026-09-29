// The ar language pack. It must not import from the registry (or anything else in the main
// bundle): the app awaits this chunk before its first render, so a cycle would never resolve.
import type { LocalePack } from "../registry";
import { AR } from "../docs/ar";
import { ar } from "../strings/ar";

const pack: LocalePack = { strings: ar, docs: AR };
export default pack;
