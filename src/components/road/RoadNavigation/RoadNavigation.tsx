import { useEffect, useRef, useState } from "preact/hooks";
import closeIcon from "../../../assets/pages/road/hero/navigation-close.svg?url";
import styles from "./RoadNavigation.module.css";

const copy = {
  ru: {
    label: "Разделы страницы о дороге",
    open: "Открыть навигацию по странице",
    close: "Закрыть навигацию по странице",
    links: [
      { id: "passage-recording", label: "Фиксация поездки" },
      { id: "payment-methods", label: "Способы оплаты" },
      { id: "vehicle-classes", label: "Классы авто" },
      { id: "toll-fines", label: "Штрафы" },
      { id: "gibdd", label: "ГИБДД" },
      { id: "asudd", label: "АСУДД" },
    ],
  },
  en: {
    label: "Sections of the motorway page",
    open: "Open page navigation",
    close: "Close page navigation",
    links: [
      { id: "passage-recording", label: "Passage recording" },
      { id: "payment-methods", label: "Payment methods" },
      { id: "vehicle-classes", label: "Vehicle classes" },
      { id: "toll-fines", label: "Fines" },
      { id: "gibdd", label: "Traffic police" },
      { id: "asudd", label: "Traffic control" },
    ],
  },
};

export default function RoadNavigation({ locale = "ru" }: { locale?: "ru" | "en" }) {
  const navigationRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const text = copy[locale];

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: Event) => {
      if (event.target instanceof Node && !navigationRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      toggleRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <nav
      ref={navigationRef}
      class={`${styles.navigation}${open ? ` ${styles.expanded}` : ""}`}
      aria-label={text.label}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setOpen(false);
      }}
    >
      <button
        ref={toggleRef}
        class={styles.toggle}
        type="button"
        aria-label={open ? text.close : text.open}
        aria-expanded={open}
        aria-controls="road-page-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span class={styles.menuIcon} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <img class={styles.closeIcon} src={closeIcon} alt="" />
      </button>
      <div class={styles.panel} id="road-page-navigation" aria-hidden={!open}>
        <ul class={styles.links}>
          {text.links.map((link) => (
            <li key={link.id}>
              <a
                class={styles.link}
                href={`#${link.id}`}
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
