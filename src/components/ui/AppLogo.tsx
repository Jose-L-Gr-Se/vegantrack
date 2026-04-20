interface AppLogoProps {
  className?: string;
  alt?: string;
}

export function AppLogo({ className = '', alt = 'VeganTrack' }: AppLogoProps) {
  return <img src="/vegantrack-icon-rounded-256.png" alt={alt} className={className} />;
}
