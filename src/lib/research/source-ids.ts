export function stripSourcePrefix(sourceId: string) {
  return sourceId.replace(/^(loc|internet_archive):/, "");
}

export function archiveLookupIds(sourceIds: string[]) {
  return Array.from(new Set(sourceIds.flatMap((sourceId) => [sourceId, stripSourcePrefix(sourceId)])));
}
