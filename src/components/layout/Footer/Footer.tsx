import envelopeIcon from "../../../assets/icons/home/footer-envelope.svg?url";
import type { HeaderLocale } from "../Header/Header";
import divider from "../../../assets/components/footer/divider.svg?url";
import styles from "./Footer.module.css";

const navigation = [
  [
    { key: "top", ru: "В начало", en: "Back to Top" },
    { key: "road", ru: "О дороге", en: "About the Road" },
    { key: "map", ru: "Карта", en: "Map" },
  ],
  [
    { key: "tariffs", ru: "Тарифы", en: "Tolls" },
    { key: "paymentMethods", ru: "Способы оплаты", en: "Payment Methods" },
    { key: "contacts", ru: "Контакты", en: "Contacts" },
  ],
  [
    { key: "company", ru: "О компании", en: "About Us" },
    { key: "security", ru: "Транспортная безопасность", en: "Transport Security" },
    { key: "documents", ru: "Документы компании", en: "Company Documents" },
  ],
  [
    { key: "trafficPolice", ru: "ГИБДД", en: "Traffic Police" },
    { key: "rdt", ru: "РДТ", en: "RDT" },
    { key: "trafficManagement", ru: "АСУДД", en: "Traffic Management" },
  ],
] as const;

type FooterDestination = (typeof navigation)[number][number]["key"] | "max" | "vk";

const defaultLinks: Partial<Record<FooterDestination, string>> = {
  top: "#top",
  trafficPolice: "https://госавтоинспекция.рф/",
};

const copy = {
  ru: {
    brand: "РУСДОР ТЕЛЕМАТИКА",
    copyright: "© 2026 ООО «РДТ». Все права защищены.",
    navigation: "Навигация в подвале",
    vk: "ВКонтакте",
  },
  en: {
    brand: "RUSDOR TELEMATIKA",
    copyright: "© 2026 RusDor Telematika LLC. All rights reserved.",
    navigation: "Footer navigation",
    vk: "VK",
  },
};

const email = "reception@rusdor-telematika.ru";

interface FooterProps {
  locale?: HeaderLocale;
  links?: Partial<Record<FooterDestination, string>>;
}

export function Footer({ locale = "ru", links }: FooterProps) {
  const labels = copy[locale];
  const destinations = { ...defaultLinks, ...links };

  return (
    <footer class={styles.footer} lang={locale}>
      <img class={styles.divider} src={divider} alt="" width="1360" height="2" />

      <div class={styles.identity}>
        <a class={styles.brand} href={locale === "ru" ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}en/`}>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width="80" height="80" />
          <span>{labels.brand}</span>
        </a>
        <p class={styles.copyright}>{labels.copyright}</p>
      </div>

      <nav class={styles.navigation} aria-label={labels.navigation}>
        {navigation.map((column) => (
          <ul class={styles.column} key={column[0].key}>
            {column.map((item) => {
              const href = destinations[item.key];

              return (
                <li key={item.key}>
                  <a
                    href={href}
                    role={href ? undefined : "link"}
                    aria-disabled={href ? undefined : true}
                  >
                    {item[locale]}
                  </a>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>

      <div class={styles.contacts}>
        <a
          class={styles.social}
          href={destinations.max}
          role={destinations.max ? undefined : "link"}
          aria-disabled={destinations.max ? undefined : true}
          aria-label="MAX"
        >
          <span class={styles.maxLogo} aria-hidden="true" />
        </a>
        <a
          class={styles.social}
          href={destinations.vk}
          role={destinations.vk ? undefined : "link"}
          aria-disabled={destinations.vk ? undefined : true}
          aria-label={labels.vk}
        >
          <span class={styles.vkLogo} aria-hidden="true" />
        </a>
        <a class={styles.email} href={`mailto:${email}`}>
          <span class={styles.emailIcon}>
            <img src={envelopeIcon} alt="" width="20" height="16" />
          </span>
          {email}
        </a>
      </div>
    </footer>
  );
}
