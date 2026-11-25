import transponderIcon from "../../../assets/pages/road/passage-recording/transponder.svg?url";
import plateIcon from "../../../assets/pages/road/passage-recording/number-plate.svg?url";
import transponder from "../../../assets/pages/road/passage-recording/transponder.webp";
import registrationPlate from "../../../assets/pages/road/passage-recording/registration-plate.svg?url";
import PassageVideo from "../PassageVideo/PassageVideo";
import styles from "./PassageRecording.module.css";

type Locale = "ru" | "en";

const copy = {
  ru: {
    heading: "Фиксация проезда",
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
    heading: "Passage recording",
    description: "The road uses Free Flow tolling. Gantries record each passage while your vehicle keeps moving.",
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

export default function PassageRecording({ locale = "ru" }: Props) {
  const text = copy[locale];
  const methods = [
    { id: "transponder", icon: transponderIcon, art: transponder },
    { id: "plate", icon: plateIcon, art: { src: registrationPlate, width: 1276, height: 829 } },
  ] as const;

  return (
    <section class={styles.section} id="passage-recording" aria-labelledby="passage-recording-title">
      <div class={styles.intro}>
        <h2 class={styles.heading} id="passage-recording-title">{text.heading}</h2>
        <p class={styles.description}>{text.description}</p>
      </div>

      <div class={styles.grid}>
        {methods.map((method) => (
          <article class={styles.card} key={method.id}>
            <div class={`${styles.content} ${method.id === "plate" ? styles.plateContent : ""}`}>
              <div class={styles.cardHeading}>
                <span class={styles.icon}><img src={method.icon} width="24" height="24" alt="" /></span>
                <h3 class={styles.cardTitle}>{text.methods[method.id].title}</h3>
              </div>
              <p class={styles.cardDescription}>{text.methods[method.id].description}</p>
              <img
                class={`${styles.art} ${method.id === "transponder" ? styles.transponderArt : styles.plateArt}`}
                src={method.art.src}
                width={method.art.width}
                height={method.art.height}
                loading="lazy"
                decoding="async"
                alt=""
              />
            </div>
            <PassageVideo mode={method.id} locale={locale} />
          </article>
        ))}
      </div>
    </section>
  );
}
