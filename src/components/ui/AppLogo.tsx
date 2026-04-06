interface AppLogoProps {
  className?: string;
  alt?: string;
}

export function AppLogo({ className = '', alt = 'VeganTrack' }: AppLogoProps) {
  return <img src="/icon.svg" alt={alt} className={className} />;
}
