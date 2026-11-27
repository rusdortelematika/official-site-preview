import { FeatureCard } from "../../common/FeatureCard/FeatureCard";
import documentIcon from "../../../assets/icons/home/document.svg?url";
import blueArrow from "../../../assets/pages/home/company/arrow-big-blue.svg?url";
import whiteArrow from "../../../assets/pages/home/company/arrow-big-white.svg?url";
import road from "../../../assets/pages/home/company/road.png";
import car from "../../../assets/pages/home/company/free-flow-car.png";
import frontGuardrail from "../../../assets/pages/home/company/front-guardrail.png";
import gantry from "../../../assets/pages/home/company/gantry.png";
import documentsFolder from "../../../assets/pages/home/company/documents-folder.png";
import styles from "./AboutCompany.module.css";

const copy = {
  ru: { heading: "О компании", company: "РДТ", documents: "Документы\nкомпании" },
  en: { heading: "About the Company", company: "RDT", documents: "Company\ndocuments" },
};

export function AboutCompany({ locale, href }: { locale: "ru" | "en"; href: string }) {
  const text = copy[locale];
  const companyHref = `${import.meta.env.BASE_URL}${locale === "en" ? "en/" : ""}rdt/`;

  return (
    <section class={styles.section} id="about-company" aria-labelledby="about-company-title">
      <h2 id="about-company-title" class={styles.heading}>{text.heading}</h2>
      <div class={styles.companyGrid}>
        <FeatureCard className={styles.company} title={text.company} tone="dark" arrow={whiteArrow} href={companyHref}>
          <span class={`${styles.art} ${styles.roadScene}`}>
            <img class={styles.roadway} src={road.src} width={road.width} height={road.height} alt="" loading="lazy" decoding="async" />
            <img class={styles.roadCar} src={car.src} width={car.width} height={car.height} alt="" loading="lazy" decoding="async" />
            <img class={styles.guardrail} src={frontGuardrail.src} width={frontGuardrail.width} height={frontGuardrail.height} alt="" loading="lazy" decoding="async" />
            <img class={styles.gantry} src={gantry.src} width={gantry.width} height={gantry.height} alt="" loading="lazy" decoding="async" />
          </span>
        </FeatureCard>

        <FeatureCard
          className={styles.documents}
          title={text.documents}
          icon={documentIcon}
          arrow={blueArrow}
          href={href}
          outlined
        >
          <span class={styles.art}>
            <img src={documentsFolder.src} width={documentsFolder.width} height={documentsFolder.height} alt="" loading="lazy" decoding="async" />
          </span>
        </FeatureCard>
      </div>
    </section>
  );
}
