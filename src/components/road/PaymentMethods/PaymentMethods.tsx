import bankCard from "../../../assets/pages/home/road/bank-card.png";
import sbpLogo from "../../../assets/pages/road/payment-methods/sbp.svg?url";
import paymentIcon from "../../../assets/pages/road/payment-methods/payment-card.svg?url";
import styles from "./PaymentMethods.module.css";

type Locale = "ru" | "en";

const copy = {
  ru: {
    heading: "Способы оплаты",
    description: "Оплачивайте проезд любым удобным вам способом на странице оплаты.",
    methods: {
      card: {
        title: "Банковской картой",
        description: "Оплатите проезд онлайн с использованием любой карты российского банка.",
      },
      sbp: {
        title: "Через СБП",
        description: "Выберите СБП при оплате и подтвердите платёж в приложении своего банка.",
      },
    },
    pay: "Оплатить",
    hint: "Для оплаты проезда необходимо перейти на страницу оплаты.",
  },
  en: {
    heading: "Payment methods",
    description: "Pay for your journey using your preferred method on the payment page.",
    methods: {
      card: {
        title: "By bank card",
        description: "Pay for your journey online using any card issued by a Russian bank.",
      },
      sbp: {
        title: "Via SBP",
        description: "Select SBP at checkout and confirm the payment in your bank’s app.",
      },
    },
    pay: "Pay",
    hint: "To pay for your journey, go to the payment page.",
  },
};

interface Props {
  locale?: Locale;
  paymentHref?: string;
}

export default function PaymentMethods({ locale = "ru", paymentHref = `${import.meta.env.BASE_URL}${locale === "en" ? "en/" : ""}pay/` }: Props) {
  const text = copy[locale];
  const methods = [
    { id: "card", image: bankCard.src, width: bankCard.width, height: bankCard.height },
    { id: "sbp", image: sbpLogo, width: 224, height: 224 },
  ] as const;

  return (
    <section class={styles.section} id="payment-methods" aria-labelledby="payment-methods-title">
      <div class={styles.intro}>
        <h2 class={styles.heading} id="payment-methods-title">{text.heading}</h2>
        <p class={styles.description}>{text.description}</p>
      </div>

      <div class={styles.grid}>
        {methods.map((method) => (
          <article class={styles.card} data-payment-method={method.id} aria-labelledby={`payment-method-${method.id}-title`} key={method.id}>
            <div class={styles.content}>
              <h3 class={styles.cardTitle} id={`payment-method-${method.id}-title`}>{text.methods[method.id].title}</h3>
              <p class={styles.cardDescription}>{text.methods[method.id].description}</p>
            </div>
            <div class={`${styles.illustration} ${method.id === "card" ? styles.bankIllustration : ""}`}>
              <img class={styles.art} src={method.image} width={method.width} height={method.height} loading="lazy" decoding="async" alt="" />
            </div>
          </article>
        ))}
      </div>

      <div class={styles.action}>
        <a
          class={styles.payment}
          href={paymentHref}
        >
          <img class={styles.paymentIcon} src={paymentIcon} alt="" />
          <span>{text.pay}</span>
        </a>
        <p class={styles.hint}>
          <span class={styles.hintArrow} aria-hidden="true">←</span>
          <span>{text.hint}</span>
        </p>
      </div>
    </section>
  );
}
