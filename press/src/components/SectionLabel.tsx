import { Rule } from '@/components/Rule';

/** Section headers are engraved rules now — same API, clubhouse look. */
export function SectionLabel({ children }: { children: string }) {
  return <Rule label={children} />;
}
