export type ProgramAliasSource = {
  name: string

  legacy_aliases: string[]
}

const LEGACY_ALIASES: Record<string, string[]> = {
  "bsit - information technology": ["BSIT"],

  "bscs - computer science": ["BSCS"],

  "bsba - business administration": ["BSBA"],

  "bsed - secondary education": ["BSEd"],

  "bshm - hospitality management": ["BSHM"],
}

const LEGACY_PROGRAM_NAMES = new Map(
  Object.entries(LEGACY_ALIASES).flatMap(([name, aliases]) =>
    aliases.map((alias) => [alias.toLowerCase(), name] as const),
  ),
)

export function eventMatchesProgram(
  eventProgram: string | null | undefined,

  studentProgram: string | null | undefined,

  catalog: readonly ProgramAliasSource[] = [],
) {
  if (!eventProgram || eventProgram.trim().toLowerCase() === "all programs") {
    return true
  }

  if (!studentProgram) return false

  const normalize = (value: string) => value.trim().toLowerCase()

  const target = normalize(studentProgram)

  const program = catalog.find(
    (candidate) =>
      normalize(candidate.name) === target ||
      candidate.legacy_aliases.some((alias) => normalize(alias) === target),
  )

  const canonicalName =
    program?.name ?? LEGACY_PROGRAM_NAMES.get(target) ?? studentProgram

  const aliases =
    program?.legacy_aliases ?? LEGACY_ALIASES[canonicalName.toLowerCase()] ?? []

  return eventProgram
    .split("/")
    .some((value) =>
      [studentProgram, canonicalName, ...aliases].some(
        (alias) => normalize(value) === normalize(alias),
      ),
    )
}

export function buildProgramEventFilter(
  studentProgram: string,

  catalog: readonly ProgramAliasSource[],
) {
  const normalize = (value: string) => value.trim().toLowerCase()

  const program = catalog.find(
    (candidate) =>
      normalize(candidate.name) === normalize(studentProgram) ||
      candidate.legacy_aliases.some(
        (alias) => normalize(alias) === normalize(studentProgram),
      ),
  )

  const target = normalize(studentProgram)

  const canonicalName =
    program?.name ?? LEGACY_PROGRAM_NAMES.get(target) ?? studentProgram

  const aliases =
    program?.legacy_aliases ?? LEGACY_ALIASES[canonicalName.toLowerCase()] ?? []

  const values = new Set([
    "All Programs",

    studentProgram,

    canonicalName,

    ...aliases,
  ])

  for (const alias of aliases) {
    for (const candidate of catalog) {
      if (normalize(candidate.name) === normalize(studentProgram)) continue

      for (const otherAlias of candidate.legacy_aliases) {
        values.add(`${alias} / ${otherAlias}`)

        values.add(`${otherAlias} / ${alias}`)
      }
    }
  }

  const quotedValues = [...values]

    .map((value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)

    .join(",")

  return `program.is.null,program.in.(${quotedValues})`
}
