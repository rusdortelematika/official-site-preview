import { useEffect, useState } from "preact/hooks";
import { FeedbackButton } from "../FeedbackButton/FeedbackButton";
import styles from "./FloatingActions.module.css";

export default function FloatingActions({ locale = "ru" }: { locale?: "ru" | "en" }) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopLabel = locale === "ru" ? "Наверх" : "Back to top";

  useEffect(() => {
    const updateVisibility = () => {
      setShowScrollTop(window.scrollY > window.innerHeight * 1.5);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    window.addEventListener("pageshow", updateVisibility);
    document.addEventListener("astro:page-load", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
      window.removeEventListener("pageshow", updateVisibility);
      document.removeEventListener("astro:page-load", updateVisibility);
    };
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <div class={styles.actions} data-floating-actions>
      <button
        class={`${styles.scrollTop}${showScrollTop ? ` ${styles.visible}` : ""}`}
        type="button"
        aria-label={scrollTopLabel}
        aria-hidden={!showScrollTop}
        tabIndex={showScrollTop ? 0 : -1}
        title={scrollTopLabel}
        data-scroll-to-top
        onClick={scrollToTop}
      >
        <svg class={styles.arrow} viewBox="0 0 32 20" width="56" height="36" fill="none" aria-hidden="true">
          <path d="m3 16 13-12 13 12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <FeedbackButton locale={locale} />
    </div>
  );
}
