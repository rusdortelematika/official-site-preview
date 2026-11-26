import styles from "./PaymentSearch.module.css";

type Locale = "ru" | "en";
const copy = {
  ru: {
    title: "Поиск задолженности за проезд по платным автомобильным дорогам",
    plate: "Госномер автомобиля",
    platePlaceholder: "А 000 АА 000",
    otherFormat: "Госномер иного образца",
    phone: "Телефон",
    phoneHint: "На указанный номер будет отправлено SMS с паролем.",
    consentStart: "Нажимая «Найти», я даю согласие на ",
    consentSubject: "обработку персональных данных",
    find: "Найти",
  },
  en: {
    title: "Find outstanding toll charges for your journeys",
    plate: "Vehicle registration number",
    platePlaceholder: "A 000 AA 000",
    otherFormat: "Other number plate format",
    phone: "Phone number",
    phoneHint: "An SMS with a password will be sent to this number.",
    consentStart: "By clicking ‘Find’, I consent to the ",
    consentSubject: "processing of my personal data",
    find: "Find",
  },
};

export default function PaymentSearch({ locale = "ru" }: { locale?: Locale }) {
  const text = copy[locale];

  return (
    <section class={styles.section} aria-labelledby="payment-search-title">
      <div class={styles.card}>
        <h1 class={styles.title} id="payment-search-title">{text.title}</h1>
        <div class={styles.form}>
          <div class={styles.vehicle}>
            <div class={styles.field}>
              <label for="payment-registration">{text.plate}</label>
              <input
                class={styles.input}
                id="payment-registration"
                type="text"
                placeholder={text.platePlaceholder}
                autoComplete="off"
                autoCapitalize="characters"
                spellcheck={false}
              />
            </div>
            <label class={styles.checkbox}>
              <input type="checkbox" />
              <span>{text.otherFormat}</span>
            </label>
          </div>

          <div class={styles.field}>
            <label for="payment-phone">{text.phone}</label>
            <input
              class={styles.input}
              id="payment-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-describedby="payment-phone-hint"
            />
            <p class={styles.hint} id="payment-phone-hint">{text.phoneHint}</p>
          </div>

          <div class={styles.action}>
            <p class={styles.consent}>
              {text.consentStart}<span class={styles.consentSubject}>{text.consentSubject}</span>.
            </p>
            <button class={styles.submit} type="button" disabled>{text.find}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
