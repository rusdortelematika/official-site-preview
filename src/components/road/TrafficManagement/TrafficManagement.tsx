import controlCenter from "../../../assets/pages/road/traffic-management/control-center.png";
import flowIcon from "../../../assets/pages/road/traffic-management/flow-monitoring.svg?url";
import signIcon from "../../../assets/pages/road/traffic-management/road-sign.svg?url";
import controlIcon from "../../../assets/pages/road/traffic-management/traffic-control.svg?url";
import styles from "./TrafficManagement.module.css";

const copy = {
  ru: {
    heading: "АСУДД",
    description: "Автоматизированная система управления дорожным движением помогает следить за потоком транспорта, информировать водителей и управлять движением.",
    features: [
      { title: "Мониторинг потока", description: "Система собирает данные о движении в реальном времени." },
      { title: "Дорожные табло", description: "На табло можно сообщать водителям об изменениях на трассе." },
      { title: "Управление движением", description: "Оператор применяет сценарии по дорожной обстановке." },
    ],
  },
  en: {
    heading: "Traffic management",
    description: "The automated traffic management system helps monitor traffic flow, inform drivers and manage traffic.",
    features: [
      { title: "Traffic flow monitoring", description: "The system collects real-time traffic data." },
      { title: "Road information signs", description: "Signs inform drivers about changes along the motorway." },
      { title: "Traffic control", description: "The operator applies traffic management plans to suit road conditions." },
    ],
  },
};

export default function TrafficManagement({ locale = "ru" }: { locale?: "ru" | "en" }) {
  const text = copy[locale];
  const icons = [flowIcon, signIcon, controlIcon];

  return (
    <section class={styles.section} id="asudd" aria-labelledby="asudd-title">
      <div class={styles.header}>
        <h2 class={styles.heading} id="asudd-title">{text.heading}</h2>
        <p class={styles.description}>{text.description}</p>
      </div>

      <div class={styles.layout}>
        <ul class={styles.features}>
          {text.features.map((feature, index) => (
            <li class={styles.feature} key={feature.title}>
              <span class={styles.icon} aria-hidden="true">
                <img src={icons[index]} width="19" height="19" alt="" />
              </span>
              <div class={styles.featureText}>
                <h3 class={styles.featureTitle}>{feature.title}</h3>
                <p class={styles.featureDescription}>{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div class={styles.illustration} aria-hidden="true">
          <img
            class={styles.controlCenter}
            src={controlCenter.src}
            width={controlCenter.width}
            height={controlCenter.height}
            loading="lazy"
            decoding="async"
            alt=""
          />
        </div>
      </div>
    </section>
  );
}
