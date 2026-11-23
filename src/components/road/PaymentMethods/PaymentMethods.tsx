import transponderIcon from "../../../assets/pages/road/payment-methods/transponder.svg?url";
import plateIcon from "../../../assets/pages/road/payment-methods/number-plate.svg?url";
import transponder from "../../../assets/pages/road/payment-methods/transponder.webp";
import bankCard from "../../../assets/pages/home/road/bank-card.png";
import PaymentVideo from "../PaymentVideo/PaymentVideo";
import VehicleClasses from "../VehicleClasses/VehicleClasses";
import TollFines from "../TollFines/TollFines";
import styles from "./PaymentMethods.module.css";

type Locale = "ru" | "en";

const copy = {
  ru: {
    heading: "Способы оплаты",
    description: "На дороге действует система «Свободный поток». Рамки фиксируют проезд, пока автомобиль продолжает движение.",
    methods: {
      transponder: {
        title: "С транспондером",
        description: "Если устройство совместимо с системой, рамка считывает его при проезде. Плата списывается с лицевого счёта транспондера.",
      },
      plate: {
        title: "По госномеру",
        description: "Система распознаёт номер автомобиля. Оплатить начисление можно после поездки на сайте оператора, указав госномер.",
      },
    },
  },
  en: {
    heading: "Payment methods",
    description: "YULA uses Free Flow tolling. Gantries record each passage while your vehicle keeps moving.",
    methods: {
      transponder: {
        title: "With a transponder",
        description: "If your device is compatible, the gantry reads it as you pass. The toll is charged to your transponder account.",
      },
      plate: {
        title: "By number plate",
        description: "Without a transponder, the system recognises your number plate. You can pay after your journey using your vehicle registration number.",
      },
    },
  },
};

interface Props {
  locale?: Locale;
}

export default function PaymentMethods({ locale = "ru" }: Props) {
  const text = copy[locale];
  const methods = [
    { id: "transponder", icon: transponderIcon, art: transponder },
    { id: "plate", icon: plateIcon, art: bankCard },
  ] as const;

  return (
    <section class={styles.section} id="payment-methods" aria-labelledby="payment-methods-title">
      <h1 class={styles.heading} id="payment-methods-title">{text.heading}</h1>
      <p class={styles.description}>{text.description}</p>

      <div class={styles.grid}>
        {methods.map((method) => (
          <article class={styles.card} key={method.id}>
            <div class={styles.content}>
              <span class={styles.icon}><img src={method.icon} width="24" height="24" alt="" /></span>
              <h2 class={styles.cardTitle}>{text.methods[method.id].title}</h2>
              <p class={styles.cardDescription}>{text.methods[method.id].description}</p>
              <img
                class={styles.art}
                src={method.art.src}
                width={method.art.width}
                height={method.art.height}
                loading="lazy"
                decoding="async"
                alt=""
              />
            </div>
            <PaymentVideo mode={method.id} locale={locale} />
          </article>
        ))}
      </div>

      <div class={styles.details}>
        <VehicleClasses locale={locale} />
        <TollFines locale={locale} />
      </div>
    </section>
  );
}
