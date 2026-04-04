// ProfileSetup is no longer used — user profiles are derived from the credentials store.
// Kept as a placeholder to avoid import errors if referenced elsewhere.
export function ProfileSetup(_props: {
  actor?: unknown;
  onComplete?: () => void;
}) {
  return null;
}
