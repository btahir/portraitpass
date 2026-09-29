// The bn language pack. It must not import from the registry (or anything else in the main
// bundle): the app awaits this chunk before its first render, so a cycle would never resolve.
import type { LocalePack } from "../registry";
import { BN } from "../docs/bn";
import { bn } from "../strings/bn";

const pack: LocalePack = { strings: bn, docs: BN };
export default pack;
