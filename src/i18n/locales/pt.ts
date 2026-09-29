// The pt language pack. It must not import from the registry (or anything else in the main
// bundle): the app awaits this chunk before its first render, so a cycle would never resolve.
import type { LocalePack } from "../registry";
import { PT } from "../docs/pt";
import { pt } from "../strings/pt";

const pack: LocalePack = { strings: pt, docs: PT };
export default pack;
