import type { ComponentChildren } from "preact";
import styles from "./DevelopmentRibbon.module.css";

interface DevelopmentRibbonProps {
  children: ComponentChildren;
  locale?: "ru" | "en";
  enabled?: boolean;
  label?: string;
  angle?: number;
  position?: string;
  className?: string;
}

export function DevelopmentRibbon({
  children,
  locale = "ru",
  enabled = true,
  label = locale === "ru" ? "В РАЗРАБОТКЕ" : "IN DEVELOPMENT",
  angle = -13.47,
  position = "50%",
  className,
}: DevelopmentRibbonProps) {
  return (
    <div class={`${styles.wrapper} ${className ?? ""}`}>
      {children}
      {enabled && (
        <>
          <span class="sr-only">{label}</span>
          <div
            class={styles.overlay}
            aria-hidden="true"
            style={{ "--ribbon-angle": `${angle}deg`, "--ribbon-position": position }}
          >
            <div class={styles.tape}>
              {Array.from({ length: 16 }, (_, index) => <span key={index}>{label}</span>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
