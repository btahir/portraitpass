// The ur language pack. It must not import from the registry (or anything else in the main
// bundle): the app awaits this chunk before its first render, so a cycle would never resolve.
import type { LocalePack } from "../registry";
import { UR } from "../docs/ur";
import { ur } from "../strings/ur";

const pack: LocalePack = { strings: ur, docs: UR };
export default pack;
