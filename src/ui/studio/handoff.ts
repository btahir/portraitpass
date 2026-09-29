/** What the shell hands to the studio when it opens from Home. The studio takes it once. */
export type Intake =
  | { kind: "file"; file: File }
  | { kind: "sample" }
  | { kind: "camera" }
  | { kind: "project"; file: File };
