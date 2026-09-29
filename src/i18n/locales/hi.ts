// The hi language pack. It must not import from the registry (or anything else in the main
// bundle): the app awaits this chunk before its first render, so a cycle would never resolve.
import type { LocalePack } from "../registry";
import { HI } from "../docs/hi";
import { hi } from "../strings/hi";

const pack: LocalePack = { strings: hi, docs: HI };
export default pack;
