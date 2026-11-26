import { useId, useState } from "preact/hooks";
import transponderIcon from "../../../assets/pages/road/passage-recording/transponder.svg?url";
import plateIcon from "../../../assets/pages/road/passage-recording/number-plate.svg?url";
import transponder from "../../../assets/pages/road/passage-recording/transponder.webp";
import registrationPlate from "../../../assets/pages/road/passage-recording/registration-plate.svg?url";
import PassageRecordingVideo from "./PassageRecordingVideo";
import styles from "./PassageRecording.module.css";

type Locale = "ru" | "en";
type Mode = "transponder" | "plate";

const modes = [
  { id: "plate", icon: plateIcon, art: { src: registrationPlate, width: 1276, height: 829 } },
  { id: "transponder", icon: transponderIcon, art: transponder },
] as const;

const copy = {
  ru: {
    heading: "Фиксация проезда",
    description: "На ЮЛА действует система «Свободный поток». Рамки фиксируют проезд, пока автомобиль продолжает движение.",
    switcher: "Способ фиксации проезда",
    methods: {
      transponder: {
        label: "С транспондером",
        title: "Рамка считывает транспондер",
        description: "Если устройство совместимо с системой, проезд фиксируется автоматически. Плата списывается с лицевого счёта транспондера.",
        benefit: "Без остановок",
        hint: "Достаточно проехать под рамкой.",
      },
      plate: {
        label: "По госномеру",
        title: "Камера распознаёт госномер",
        description: "Система распознаёт номер автомобиля. Оплатить начисление можно после поездки на сайте оператора, указав госномер.",
        benefit: "Оплата после проезда",
        hint: "Укажите госномер на сайте оператора.",
      },
    },
  },
  en: {
    heading: "Passage recording",
    description: "The road uses Free Flow tolling. Gantries record each passage while your vehicle keeps moving.",
    switcher: "Passage recording method",
    methods: {
      transponder: {
        label: "With a transponder",
        title: "The gantry reads your transponder",
        description: "If your device is compatible, your passage is recorded automatically. The toll is charged to your transponder account.",
        benefit: "Keep moving",
        hint: "Simply drive under the gantry.",
      },
      plate: {
        label: "By number plate",
        title: "The camera recognises your number plate",
        description: "The system recognises your vehicle registration number. You can pay after your journey on the operator’s website using your number plate.",
        benefit: "Pay after your journey",
        hint: "Enter your number plate on the operator’s website.",
      },
    },
  },
};

interface Props {
  locale?: Locale;
}

export default function PassageRecording({ locale = "ru" }: Props) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("plate");
  const text = copy[locale];

  return (
    <section
      class={styles.section}
      id="passage-recording"
      aria-labelledby={`${id}-title`}
      data-recording-mode={mode}
    >
      <div class={styles.intro}>
        <h2 class={styles.heading} id={`${id}-title`}>{text.heading}</h2>
        <p class={styles.description}>{text.description}</p>
      </div>

      <div class={styles.card}>
        <div class={styles.content}>
          <div class={styles.switcher} role="group" aria-label={text.switcher}>
            {modes.map((item) => (
              <button
                class={styles.mode}
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                aria-controls={`${id}-details ${id}-scene`}
                onClick={() => setMode(item.id)}
              >
                <img src={item.icon} width="20" height="20" alt="" />
                <span>{text.methods[item.id].label}</span>
              </button>
            ))}
          </div>

          <div class={styles.details} id={`${id}-details`} aria-live="polite" aria-atomic="true">
            {modes.map((item) => (
              <div class={styles.detailPane} key={item.id} aria-hidden={mode !== item.id}>
                <div class={styles.explanation}>
                  <h3 class={styles.title}>{text.methods[item.id].title}</h3>
                  <p class={styles.body}>{text.methods[item.id].description}</p>
                </div>
                <div class={styles.benefit}>
                  <img
                    class={styles.art}
                    src={item.art.src}
                    width={item.art.width}
                    height={item.art.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <div class={styles.benefitCopy}>
                    <p class={styles.benefitTitle}>{text.methods[item.id].benefit}</p>
                    <p class={styles.hint}>{text.methods[item.id].hint}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div class={styles.scene} id={`${id}-scene`}>
          <PassageRecordingVideo mode={mode} locale={locale} />
        </div>
      </div>
    </section>
  );
}
