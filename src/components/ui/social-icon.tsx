export type SocialPlatform = "facebook" | "instagram" | "linkedin";

const PATHS: Record<SocialPlatform, React.ReactNode> = {
  facebook: (
    <path d="M14 9h-2c-.5 0-1 .5-1 1.2V12h3l-.4 3h-2.6v7h-3v-7H6v-3h2V9.8C8 7.1 9.6 5.5 12 5.5c1.1 0 2 .1 2.3.1V8H13c-.7 0-1 .3-1 1v1z" />
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.4" cy="7.6" r="1" />
    </>
  ),
  linkedin: (
    <>
      <rect x="4" y="9" width="3" height="10" />
      <circle cx="5.5" cy="5.5" r="1.8" />
      <path d="M10 9h3v1.5c.6-1 1.7-1.7 3-1.7 2.5 0 3.5 1.7 3.5 4.2V19h-3v-5.3c0-1.2-.4-2-1.5-2s-1.7.8-1.7 2V19h-3.3V9z" />
    </>
  ),
};

export function SocialIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {PATHS[platform]}
    </svg>
  );
}
