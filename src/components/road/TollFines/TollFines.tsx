import styles from "./TollFines.module.css";

type Locale = "ru" | "en";

const copy = {
  ru: {
    heading: "Информация о штрафах",
    situation: "Ситуация",
    action: "Что нужно сделать",
    description: "Порядок действий за неоплату проезд по платному участку автодороги.",
    items: [
      {
        title: "Оплата проезда в течение 20 дней",
        description: "Погасите задолженность не позднее 20 дней с даты вынесения постановления. При выполнении этого условия закон предусматривает освобождение от ответственности и прекращение дела.",
      },
      {
        title: "Штраф не погашает задолженность",
        description: "После истечения 20-дневного срока при действующем постановлении нужно оплатить и проезд, и штраф. Уплата штрафа сама по себе не погашает задолженность за поездку.",
      },
      {
        title: "Возврат уплаченного штрафа",
        description: "Если проезд оплачен в 20-дневный срок и постановление отменено, обратитесь за возвратом в орган, который его вынес. Подготовьте копию постановления, документы об оплате проезда и штрафа, а также реквизиты для возврата.",
      },
      {
        title: "Обжалование постановления",
        description: "Срок подачи жалобы — 10 дней с момента вручения или получения копии постановления. Адресат и порядок обжалования указаны в документе.",
      },
      {
        title: "Куда обращаться",
        description: "По вопросам отмены постановления и возврата штрафа обращайтесь в орган, указанный в постановлении. По общим вопросам о дорогах Московской области — в веб-приёмную Минтранса МО.",
      },
    ],
    links: ["Приёмная Минтранса МО", "Правило 20 дней", "Сроки обжалования"],
  },
  en: {
    heading: "Information about fines",
    situation: "Situation",
    action: "What you need to do",
    description: "What to do if a penalty notice is issued for an unpaid journey on a YULA toll section.",
    items: [
      {
        title: "Pay the toll within 20 days",
        description: "Settle the outstanding toll within 20 days of the date the penalty notice was issued. When this condition is met, the law provides for release from liability and termination of the case.",
      },
      {
        title: "Paying the fine does not settle the toll",
        description: "After the 20-day period, if the penalty notice remains valid, both the toll and the fine must be paid. Paying the fine alone does not settle the outstanding toll for the journey.",
      },
      {
        title: "Refund of a paid fine",
        description: "If the toll was paid within 20 days and the penalty notice has been cancelled, request a refund from the authority that issued it. Prepare a copy of the notice, proof of payment of the toll and fine, and your refund bank details.",
      },
      {
        title: "Appealing a penalty notice",
        description: "An appeal must be filed within 10 days of being served with or receiving a copy of the penalty notice. The notice specifies who to contact and how to appeal.",
      },
      {
        title: "Who to contact",
        description: "For cancellation of a penalty notice or a fine refund, contact the authority named in the notice. For general questions about Moscow Region roads, use the regional Ministry of Transport’s online reception.",
      },
    ],
    links: ["Moscow Region transport reception", "The 20-day rule", "Appeal deadlines"],
  },
};

const links = [
  "https://mtdi.mosreg.ru/feedback",
  "https://www.consultant.ru/document/cons_doc_LAW_34661/68d0d57ef9baaad054c3ccd1cea97f54855095fa/",
  "https://www.consultant.ru/document/cons_doc_LAW_34661/9ae21ddd95d2541114102cce9c92efe6fc637266/",
];

export default function TollFines({ locale = "ru" }: { locale?: Locale }) {
  const text = copy[locale];

  return (
    <section class={styles.section} id="toll-fines" aria-labelledby="toll-fines-title">
      <div class={styles.intro}>
        <h2 class={styles.heading} id="toll-fines-title">{text.heading}</h2>
        <p class={styles.description}>{text.description}</p>
      </div>

      <div class={styles.tableShell}>
        <table class={styles.table} aria-labelledby="toll-fines-title">
          <colgroup>
            <col class={styles.situationColumn} />
            <col class={styles.actionColumn} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">{text.situation}</th>
              <th scope="col">{text.action}</th>
            </tr>
          </thead>
          <tbody>
            {text.items.map((item) => (
              <tr key={item.title}>
                <th class={styles.situation} scope="row">{item.title}</th>
                <td class={styles.action}>{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class={styles.links}>
        {links.map((href, index) => (
          <a class={styles.link} href={href} key={href} target="_blank" rel="noopener noreferrer">
            {text.links[index]}
          </a>
        ))}
      </div>
    </section>
  );
}
