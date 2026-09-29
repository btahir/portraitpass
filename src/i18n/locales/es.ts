// The Spanish language pack. It must not import from the registry (or anything else in the main
// bundle): the app awaits this chunk before its first render, so a cycle would never resolve.
import type { LocalePack } from "../registry";
import { ES } from "../docs/es";
import { es } from "../strings/es";

const pack: LocalePack = { strings: es, docs: ES };
export default pack;
