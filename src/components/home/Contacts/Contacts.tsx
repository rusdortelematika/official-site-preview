import emailIcon from "../../../assets/icons/home/contact-email.svg?url";
import phoneIcon from "../../../assets/icons/home/contact-phone.svg?url";
import chatIcon from "../../../assets/icons/home/contact-chat.svg?url";
import motorcyclist from "../../../assets/pages/home/contacts/motorcyclist.png";
import styles from "./Contacts.module.css";

interface ContactsProps {
  locale?: "ru" | "en";
  socialLinks?: {
    max?: string;
    vk?: string;
  };
}

const copy = {
  ru: {
    heading: "Контакты",
    email: "Электронная почта",
    assistance: "Номер телефона",
    social: "Социальные сети",
    vk: "ВКонтакте",
  },
  en: {
    heading: "Contacts",
    email: "Email",
    assistance: "Phone number",
    social: "Social media",
    vk: "VKontakte",
  },
};

export function Contacts({ locale = "ru", socialLinks = {} }: ContactsProps) {
  const text = copy[locale];
  const contacts = [
    { label: text.email, value: "reception@rusdor-telematika.ru", href: "mailto:reception@rusdor-telematika.ru", icon: emailIcon },
    { label: text.assistance, value: "Скоро", href: "", icon: phoneIcon },
  ];
  const socials = [
    { label: "MAX", href: socialLinks.max, className: styles.maxLogo },
    { label: text.vk, href: socialLinks.vk, className: styles.vkLogo },
  ];

  return (
    <section class={styles.section} id="contacts" aria-labelledby="contacts-title">
      <h2 id="contacts-title" class={styles.heading}>{text.heading}</h2>
      <div class={styles.grid}>
        <ul class={styles.list}>
          {contacts.map(({ label, value, href, icon }) => (
            <li class={styles.card} key={href}>
              <span class={styles.icon} aria-hidden="true">
                <img src={icon} width="24" height="24" alt="" />
              </span>
              <div class={styles.content}>
                <p class={styles.label}>{label}</p>
                <a class={styles.value} href={href}>{value}</a>
              </div>
            </li>
          ))}
          <li class={styles.card}>
            <span class={styles.icon} aria-hidden="true">
              <img src={chatIcon} width="24" height="24" alt="" />
            </span>
            <div class={styles.content}>
              <p class={styles.label}>{text.social}</p>
              <div class={styles.socials}>
                {socials.map(({ label, href, className }) => href ? (
                  <a key={label} class={`${styles.social} ${className}`} href={href} aria-label={label} target="_blank" rel="noopener noreferrer" />
                ) : (
                  <span key={label} class={`${styles.social} ${className}`} role="img" aria-label={label} />
                ))}
              </div>
            </div>
          </li>
        </ul>
        <div class={styles.illustration} aria-hidden="true">
          <img src={motorcyclist.src} width={motorcyclist.width} height={motorcyclist.height} alt="" loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  );
}
