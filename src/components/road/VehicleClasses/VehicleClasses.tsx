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

const vehicleClasses = [
  {
    id: 1,
    description: {
      ru: "Мотоциклы, легковые автомобили полной массой до 3 тонн (высотой до 2,1 м).",
      en: "Motorcycles and passenger cars with a gross vehicle weight of up to 3 tonnes (up to 2.1 m high).",
    },
  },
  {
    id: 2,
    description: {
      ru: "Грузовые автомобили с 2 или 3 осями, микроавтобусы (высотой более 2,1 м).",
      en: "Trucks with 2 or 3 axles and minibuses (over 2.1 m high).",
    },
  },
  {
    id: 3,
    description: {
      ru: "Грузовые автомобили с количеством осей 4 и более, автоприцепы (высотой более 2,1 м), автобусы.",
      en: "Trucks with 4 or more axles, trailers (over 2.1 m high) and buses.",
    },
  },
] as const;

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
