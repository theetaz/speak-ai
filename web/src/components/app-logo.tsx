import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  size?: number;
}

export function AppLogo({ className, size = 64 }: AppLogoProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 ring-2 ring-primary/20",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/assets/images/main-logo.png"
        alt="SpeakEasy AI"
        width={size}
        height={size}
        priority
        className="object-contain scale-[1.45]"
      />
    </div>
  );
}
