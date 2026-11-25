import { useEffect, useRef, useState } from "preact/hooks";
import cardIcon from "../../../assets/icons/home/header-payment-card.svg?url";
import brandMark from "../../../assets/images/brand/rdt-header-mark.svg?url";
import styles from "./Header.module.css";

const navigation = [
  { key: "road", sectionId: "about-road", ru: "О дороге", en: "About the Road", mobile: { ru: "О дороге", en: "Road" } },
  { key: "company", sectionId: "about-company", ru: "О Компании", en: "About Us", mobile: { ru: "Компания", en: "Company" } },
  { key: "tariffs", sectionId: "tariffs", ru: "Тарифы", en: "Tolls" },
  { key: "map", sectionId: "road-map", ru: "Карта", en: "Map" },
  { key: "contacts", sectionId: "contacts", ru: "Контакты", en: "Contacts" },
] as const;

const roadSections = [
  { id: "passage-recording", ru: "Фиксация проезда", en: "Passage recording" },
  { id: "payment-methods", ru: "Способы оплаты", en: "Payment methods" },
  { id: "vehicle-classes", ru: "Классы авто", en: "Vehicle classes" },
  { id: "toll-fines", ru: "Штрафы", en: "Fines" },
  { id: "gibdd", ru: "ГИБДД", en: "Traffic police" },
  { id: "asudd", ru: "АСУДД", en: "Traffic control" },
] as const;

const languages = [
  { code: "ru", label: "Русский", key: "russian", href: import.meta.env.BASE_URL },
  { code: "en", label: "English", key: "english", href: `${import.meta.env.BASE_URL}en/` },
] as const;

export type HeaderLocale = (typeof languages)[number]["code"];

type HeaderDestination = (typeof navigation)[number]["key"] |
  (typeof languages)[number]["key"] | "payment";

const copy = {
  ru: {
    brand: ["РУСДОР", "ТЕЛЕМАТИКА"],
    navigation: "Основная навигация",
    openRoadSections: "Открыть разделы страницы о дороге",
    closeRoadSections: "Закрыть разделы страницы о дороге",
    languages: "Язык сайта",
    payment: "Оплатить",
  },
  en: {
    brand: ["RUSDOR", "TELEMATIKA"],
    navigation: "Main navigation",
    openRoadSections: "Open motorway page sections",
    closeRoadSections: "Close motorway page sections",
    languages: "Site language",
    payment: "Pay",
  },
} satisfies Record<HeaderLocale, {
  brand: [string, string];
  navigation: string;
  openRoadSections: string;
  closeRoadSections: string;
  languages: string;
  payment: string;
}>;

interface HeaderProps {
  locale?: HeaderLocale;
  responsive?: boolean;
  links?: Partial<Record<HeaderDestination, string>>;
}

export function Header({ locale = "ru", links = {}, responsive = false }: HeaderProps) {
  const labels = copy[locale];
  const homeHref = locale === "ru" ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}en/`;
  const roadHref = links.road ?? `${import.meta.env.BASE_URL}${locale === "en" ? "en/" : ""}road/`;
  const [roadOpen, setRoadOpen] = useState(false);
  const roadItemRef = useRef<HTMLLIElement>(null);
  const roadToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!roadOpen) return;

    const closeOutside = (event: Event) => {
      if (event.target instanceof Node && !roadItemRef.current?.contains(event.target)) {
        setRoadOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setRoadOpen(false);
      roadToggleRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [roadOpen]);

  return (
    <header class={responsive ? `${styles.header} ${styles.responsive}` : styles.header} lang={locale}>
      <a class={styles.brand} href={homeHref}>
        <img src={brandMark} alt="" width="48" height="48" />
        <span>
          {labels.brand[0]}
          <br />
          {labels.brand[1]}
        </span>
      </a>

      <nav class={styles.navigation} aria-label={labels.navigation}>
        <ul class={styles.navigationList}>
          {navigation.map((item) => {
            if (item.key === "road") {
              return (
                <li
                  key={item.key}
                  ref={roadItemRef}
                  class={styles.roadItem}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setRoadOpen(true);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === "mouse") setRoadOpen(false);
                  }}
                >
                  <div class={styles.roadTrigger}>
                    <a
                      class={styles.roadLink}
                      href={roadHref}
                      onFocus={() => setRoadOpen(true)}
                      onClick={() => setRoadOpen(false)}
                    >
                      {responsive ? (
                        <>
                          <span class={styles.fullLabel}>{item[locale]}</span>
                          <span class={styles.mobileLabel}>{item.mobile[locale]}</span>
                        </>
                      ) : item[locale]}
                    </a>
                    <button
                      ref={roadToggleRef}
                      class={styles.roadToggle}
                      type="button"
                      aria-label={roadOpen ? labels.closeRoadSections : labels.openRoadSections}
                      aria-expanded={roadOpen}
                      aria-controls="header-road-sections"
                      onClick={() => setRoadOpen((value) => !value)}
                    >
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                        <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                  </div>
                  <div
                    id="header-road-sections"
                    class={`${styles.roadMenu}${roadOpen ? ` ${styles.roadMenuOpen}` : ""}`}
                    aria-hidden={!roadOpen}
                  >
                    <ul class={styles.roadLinks}>
                      {roadSections.map((section) => (
                        <li key={section.id}>
                          <a
                            href={`${roadHref}#${section.id}`}
                            tabIndex={roadOpen ? undefined : -1}
                            onClick={() => setRoadOpen(false)}
                          >
                            {section[locale]}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            }

            const href = links[item.key] ?? `${homeHref}#${item.sectionId}`;

            return (
              <li key={item.key}>
                <a href={href}>
                  {responsive && "mobile" in item ? (
                    <>
                      <span class={styles.fullLabel}>{item[locale]}</span>
                      <span class={styles.mobileLabel}>{item.mobile[locale]}</span>
                    </>
                  ) : item[locale]}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div class={styles.actions}>
        <div class={styles.languages} role="group" aria-label={labels.languages}>
          {languages.map(({ code, label, key, href }) => (
            <a
              key={code}
              class={styles.language}
              href={links[key] ?? href}
              hrefLang={code}
              lang={code}
              aria-label={label}
              aria-current={locale === code ? "page" : undefined}
            >
              {code.toUpperCase()}
            </a>
          ))}
        </div>

        <a
          class={styles.payment}
          href={links.payment}
          role={links.payment ? undefined : "link"}
          aria-disabled={links.payment ? undefined : true}
        >
          <img src={cardIcon} alt="" />
          {labels.payment}
        </a>
      </div>
    </header>
  );
}
