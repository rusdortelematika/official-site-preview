import cardIcon from "../../../assets/icons/home/header-payment-card.svg?url";
import brandMark from "../../../assets/images/brand/rdt-header-mark.svg?url";
import styles from "./Header.module.css";

const navigation = [
  { key: "road", sectionId: "about-road", ru: "О Дороге", en: "About the Road", mobile: { ru: "О дороге", en: "Road" } },
  { key: "company", sectionId: "about-company", ru: "О Компании", en: "About Us", mobile: { ru: "Компания", en: "Company" } },
  { key: "tariffs", sectionId: "tariffs", ru: "Тарифы", en: "Tolls" },
  { key: "map", sectionId: "road-map", ru: "Карта", en: "Map" },
  { key: "contacts", sectionId: "contacts", ru: "Контакты", en: "Contacts" },
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
    languages: "Язык сайта",
    payment: "Оплатить",
  },
  en: {
    brand: ["RUSDOR", "TELEMATIKA"],
    navigation: "Main navigation",
    languages: "Site language",
    payment: "Pay",
  },
} satisfies Record<HeaderLocale, {
  brand: [string, string];
  navigation: string;
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
