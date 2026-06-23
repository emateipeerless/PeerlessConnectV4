import redLogo from "../logos/RedLogoNB.png";
import whiteLogo from "../logos/WhiteLogoNB.png";
import { useTheme } from "../theme/ThemeContext";

interface BrandLogoProps {
  variant?: "card" | "login" | "topbar";
  className?: string;
}

export function BrandLogo({ variant = "card", className }: BrandLogoProps) {
  const { theme } = useTheme();
  const src = theme === "light" ? redLogo : whiteLogo;

  return (
    <img
      src={src}
      alt="Peerless"
      className={[
        "brand-logo",
        `brand-logo--${variant}`,
        `brand-logo--theme-${theme}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
