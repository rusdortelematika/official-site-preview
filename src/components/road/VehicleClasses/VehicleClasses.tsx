import vehicleClasses from "../../../data/vehicle-classes.json";
import styles from "./VehicleClasses.module.css";

type Locale = "ru" | "en";

const copy = {
  ru: {
    heading: "Классы транспортных средств",
    classLabel: "Класс ТС",
    vehicleDescription: "Описание класса транспортного средства",
    maximumFee: "Максимальная плата",
    perTrip: "за проезд",
    vat: "включая НДС",
  },
  en: {
    heading: "Vehicle classes",
    classLabel: "Vehicle class",
    vehicleDescription: "Vehicle class description",
    maximumFee: "Maximum toll",
    perTrip: "per journey",
    vat: "including VAT",
  },
};

export default function VehicleClasses({ locale = "ru" }: { locale?: Locale }) {
  const text = copy[locale];

  return (
    <section class={styles.section} id="vehicle-classes" aria-labelledby="vehicle-classes-title">
      <h2 class={styles.heading} id="vehicle-classes-title">{text.heading}</h2>

      <div class={styles.tableShell}>
        <table class={styles.table} aria-labelledby="vehicle-classes-title">
          <colgroup>
            <col class={styles.classColumn} />
            <col class={styles.descriptionColumn} />
            <col class={styles.feeColumn} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">{text.classLabel}</th>
              <th scope="col">{text.vehicleDescription}</th>
              <th scope="col">{text.maximumFee}<br />{text.perTrip}</th>
            </tr>
          </thead>
          <tbody>
            {vehicleClasses.map((vehicle) => (
              <tr key={vehicle.id}>
                <th scope="row" aria-label={`${text.classLabel} ${vehicle.id}`}>
                  <span class={styles.classBadge}>{vehicle.id}</span>
                </th>
                <td class={styles.vehicleDescription}>{vehicle.description[locale]}</td>
                <td class={styles.feeCell}>
                  <div class={styles.fee}>
                    <span class={styles.amount}>___ ₽</span>
                    <span class={styles.vat}>{text.vat}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
