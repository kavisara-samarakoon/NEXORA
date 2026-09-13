export type SentinelRequestGuard = {
  begin: () => number;
  invalidate: () => void;
  isCurrent: (requestVersion: number) => boolean;
};

export function createSentinelRequestGuard(): SentinelRequestGuard {
  let activeVersion = 0;

  return {
    begin() {
      activeVersion += 1;
      return activeVersion;
    },
    invalidate() {
      activeVersion += 1;
    },
    isCurrent(requestVersion) {
      return requestVersion === activeVersion;
    },
  };
}
