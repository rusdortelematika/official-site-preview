import { FeatureCard } from "../../common/FeatureCard/FeatureCard";
import newsIcon from "../../../assets/icons/home/news.svg?url";
import carIcon from "../../../assets/icons/home/police-car.svg?url";
import safetyIcon from "../../../assets/icons/home/security-shield.svg?url";
import paymentIcon from "../../../assets/icons/home/payment-card.svg?url";
import tariffsIcon from "../../../assets/icons/home/tariff-coins.svg?url";
import trafficIcon from "../../../assets/icons/home/traffic-cone.svg?url";
import documentFolder from "../../../assets/pages/home/road/news/document-folder.webp";
import policeCar from "../../../assets/pages/home/road/police-car.png";
import securityCamera from "../../../assets/pages/home/road/security-camera.png";
import bankCard from "../../../assets/pages/home/road/bank-card.png";
import tollReceipt from "../../../assets/pages/home/road/toll-receipt.png";
import leftCoin from "../../../assets/pages/home/road/coin-left.svg?url";
import rightCoin from "../../../assets/pages/home/road/coin-right.svg?url";
import trafficCone from "../../../assets/pages/home/road/traffic-cone.png";
import styles from "./AboutRoad.module.css";

const copy = {
  ru: {
    heading: "О дороге",
    emergency: "Новости",
    police: "ГИБДД",
    safety: "Свободный поток",
    payment: "Способы\nоплаты",
    tariffs: "Тарифы",
    traffic: "АСУДД",
  },
  en: {
    heading: "About the Road",
    emergency: "News",
    police: "Traffic Police",
    safety: "Free Flow",
    payment: "Payment\nmethods",
    tariffs: "Tolls",
    traffic: "Traffic\nmanagement",
  },
};

export function AboutRoad({ locale, notFoundHref }: { locale: "ru" | "en"; notFoundHref: string }) {
  const text = copy[locale];

  return (
    <section class={styles.section} id="about-road" aria-labelledby="about-road-title">
      <h2 id="about-road-title" class={styles.heading}>{text.heading}</h2>
      <div class={styles.roadGrid}>
        <FeatureCard
          className={styles.emergency}
          title={text.emergency}
          icon={newsIcon}
          tone="burgundy"
          href={notFoundHref}
        >
          <img
            class={styles.art}
            src={documentFolder.src}
            width={documentFolder.width}
            height={documentFolder.height}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </FeatureCard>

        <FeatureCard className={styles.police} title={text.police} icon={carIcon} href={notFoundHref}>
          <span class={styles.art}>
            <img src={policeCar.src} width={policeCar.width} height={policeCar.height} alt="" loading="lazy" decoding="async" />
          </span>
        </FeatureCard>

        <FeatureCard className={styles.safety} title={text.safety} icon={safetyIcon} href={notFoundHref}>
          <span class={styles.art}>
            <img src={securityCamera.src} width={securityCamera.width} height={securityCamera.height} alt="" loading="lazy" decoding="async" />
          </span>
        </FeatureCard>

        <FeatureCard className={styles.payment} title={text.payment} icon={paymentIcon} href={notFoundHref}>
          <span class={styles.art}>
            <span class={styles.cardBacking} />
            <img src={bankCard.src} width={bankCard.width} height={bankCard.height} alt="" loading="lazy" decoding="async" />
          </span>
        </FeatureCard>

        <FeatureCard className={styles.tariffs} title={text.tariffs} icon={tariffsIcon} href={notFoundHref}>
          <span class={styles.art}>
            <img src={tollReceipt.src} width={tollReceipt.width} height={tollReceipt.height} alt="" loading="lazy" decoding="async" />
            <img class={styles.coinLeft} src={leftCoin} width="56" height="51" alt="" />
            <img class={styles.coinRight} src={rightCoin} width="53" height="49" alt="" />
          </span>
        </FeatureCard>

        <FeatureCard className={styles.traffic} title={text.traffic} icon={trafficIcon} tone="dark" href={notFoundHref}>
          <span class={styles.art}>
            <img src={trafficCone.src} width={trafficCone.width} height={trafficCone.height} alt="" loading="lazy" decoding="async" />
          </span>
        </FeatureCard>
      </div>
    </section>
  );
}
