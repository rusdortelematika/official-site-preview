import type { ComponentChildren } from "preact";
import blueArrow from "../../../assets/icons/home/arrow-up-right.svg?url";
import whiteArrow from "../../../assets/components/feature-card/arrow-white.svg?url";
import styles from "./FeatureCard.module.css";

interface FeatureCardProps {
  href: string;
  title: string;
  tone?: "light" | "burgundy" | "dark";
  icon?: string;
  number?: string;
  arrow?: string;
  outlined?: boolean;
  className?: string;
  children?: ComponentChildren;
}

export function FeatureCard({
  href,
  title,
  tone = "light",
  icon,
  number,
  arrow,
  outlined = false,
  className,
  children,
}: FeatureCardProps) {
  return (
    <a
      class={[styles.card, styles[tone], outlined && styles.outlined, className].filter(Boolean).join(" ")}
      href={href}
    >
      {children && <span class={styles.artwork} aria-hidden="true">{children}</span>}
      <span class={styles.content}>
        {(icon || number) && (
          <span class={styles.mark}>
            {icon && <span class={styles.icon}><img src={icon} alt="" /></span>}
            {number && <span class={styles.number}>{number}</span>}
          </span>
        )}
        <span class={styles.title}>{title}</span>
      </span>
      <span class={styles.arrow} aria-hidden="true">
        <img src={arrow ?? (tone === "light" ? blueArrow : whiteArrow)} alt="" />
      </span>
    </a>
  );
}
