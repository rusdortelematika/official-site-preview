import patrolCar from "../../../assets/pages/home/road/police-car.png";
import externalLinkIcon from "../../../assets/pages/road/traffic-police/external-link.svg?url";
import phoneIcon from "../../../assets/pages/road/traffic-police/emergency-phone.svg?url";
import styles from "./TrafficPolice.module.css";

type Locale = "ru" | "en";

const copy = {
  ru: {
    heading: "ГИБДД",
    directory: "Куда обращаться",
    description: "Контакты территориальных подразделений в округах вдоль дороги.",
    districts: "Округа вдоль ЮЛА",
    department: "Подразделение и адрес",
    duty: "Дежурная часть",
    mobileDirectory: "Подразделения по округам",
    source: "Источник",
    authority: "Госавтоинспекция",
    authorityDescription: "Адреса и телефоны подразделений, режим работы и сервисы для водителей.",
    divisions: "Подразделения ГИБДД",
    emergency: "Единый номер экстренных служб",
    emergencyDescription: "При ДТП или другой экстренной ситуации.",
  },
  en: {
    heading: "Traffic police",
    directory: "Who to contact",
    description: "Local traffic police departments in the districts along YULA. Contact the traffic police to confirm which department covers a particular road section.",
    districts: "Districts along YULA",
    department: "Department and address",
    duty: "Duty office",
    mobileDirectory: "Departments by district",
    source: "Source",
    authority: "State Traffic Inspectorate",
    authorityDescription: "Department addresses, phone numbers, opening hours and services for drivers.",
    divisions: "Traffic police departments",
    emergency: "Emergency services number",
    emergencyDescription: "For a road accident or another emergency.",
  },
};

const departments = [
  {
    id: "leninsky",
    district: { ru: "Ленинский городской округ", en: "Leninsky Urban District" },
    name: {
      ru: "Госавтоинспекция УМВД России по Ленинскому городскому округу",
      en: "Traffic police of the Leninsky Urban District Ministry of Internal Affairs department",
    },
    address: { ru: "Видное, Белокаменное шоссе, стр. 5", en: "5 Belokamennoye Highway, Vidnoye" },
    phone: "+7 (495) 541-45-95",
    source: "https://www.cbddmo.ru/upload/doc/ugibdd.pdf",
  },
  {
    id: "lyubertsy",
    district: { ru: "Лыткарино и Люберцы", en: "Lytkarino and Lyubertsy" },
    name: {
      ru: "Госавтоинспекция МУ МВД России «Люберецкое»",
      en: "Traffic police of the Lyubertsy Ministry of Internal Affairs department",
    },
    address: { ru: "Малаховка, Касимовское шоссе, 3А", en: "3A Kasimovskoye Highway, Malakhovka" },
    phone: "+7 (495) 501-25-83",
    source: "https://lytkarino.mosreg.ru/info/company",
  },
  {
    id: "balashikha",
    district: { ru: "Городской округ Балашиха", en: "Balashikha Urban District" },
    name: {
      ru: "Отдел ГИБДД МУ МВД России «Балашихинское»",
      en: "Traffic police of the Balashikha Ministry of Internal Affairs department",
    },
    address: {
      ru: "Балашиха, 18-й км автодороги Москва — Нижний Новгород",
      en: "18th km of the Moscow–Nizhny Novgorod Highway, Balashikha",
    },
    phone: "+7 (495) 521-99-02",
    source: "https://balashiha.ru/article/predostavlenie-gosudarstvennyh-uslug-grazhdanam-mu-mvd-rossii-balashihinskoe-167965",
  },
] as const;

export default function TrafficPolice({ locale = "ru" }: { locale?: Locale }) {
  const text = copy[locale];

  return (
    <section class={styles.section} id="gibdd" aria-labelledby="gibdd-title">
      <h2 class={styles.heading} id="gibdd-title">{text.heading}</h2>

      <div class={styles.directory}>
        <div class={styles.intro}>
          <h3 class={styles.directoryTitle} id="gibdd-directory-title">{text.directory}</h3>
          <p class={styles.description}>{text.description}</p>
        </div>
        <div class={styles.tableShell}>
          <p class={styles.mobileTableTitle} aria-hidden="true">{text.mobileDirectory}</p>
          <table class={styles.table} aria-labelledby="gibdd-directory-title">
            <colgroup>
              <col class={styles.districtColumn} />
              <col class={styles.departmentColumn} />
              <col class={styles.contactColumn} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{text.districts}</th>
                <th scope="col">{text.department}</th>
                <th scope="col">{text.duty}</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <th scope="row" class={styles.district}>{department.district[locale]}</th>
                  <td>
                    <div class={styles.department}>
                      <p class={styles.departmentName}>{department.name[locale]}</p>
                      <p class={styles.address}>{department.address[locale]}</p>
                    </div>
                  </td>
                  <td>
                    <div class={styles.contacts}>
                      <div class={styles.phoneGroup}>
                        <span class={styles.mobileDuty}>{text.duty}</span>
                        <a class={styles.phone} href={`tel:+${department.phone.replace(/\D/g, "")}`}>{department.phone}</a>
                      </div>
                      <a
                        class={styles.source}
                        href={department.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${text.source}: ${department.district[locale]}`}
                      >
                        {text.source} <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div class={styles.services}>
        <article class={styles.authority}>
          <div class={styles.authorityText}>
            <h3 class={styles.authorityTitle}>{text.authority}</h3>
            <p class={styles.authorityDescription}>{text.authorityDescription}</p>
          </div>
          <a
            class={styles.divisions}
            href="https://xn--80aebkobnwfcnsfk1e0h.xn--p1ai/divisions"
            target="_blank"
            rel="noopener noreferrer"
          >
            {text.divisions}
            <img src={externalLinkIcon} width="18" height="18" alt="" />
          </a>
          <img class={styles.patrolCar} src={patrolCar.src} width={patrolCar.width} height={patrolCar.height} loading="lazy" decoding="async" alt="" />
        </article>

        <article class={styles.emergency} aria-labelledby="gibdd-emergency-title">
          <span class={styles.emergencyIcon} aria-hidden="true"><img src={phoneIcon} width="22" height="22" alt="" /></span>
          <a class={styles.emergencyNumber} href="tel:112" aria-label={`${text.emergency}: 112`}>112</a>
          <h3 class={styles.emergencyTitle} id="gibdd-emergency-title">{text.emergency}</h3>
          <p class={styles.emergencyDescription}>{text.emergencyDescription}</p>
        </article>
      </div>
    </section>
  );
}
