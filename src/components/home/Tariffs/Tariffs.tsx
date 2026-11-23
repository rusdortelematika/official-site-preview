import { useEffect, useId, useState } from "preact/hooks";
import RoadLoader from "../../common/RoadLoader/RoadLoader";
import carIcon from "../../../assets/icons/home/vehicle-car.svg?url";
import truckIcon from "../../../assets/icons/home/vehicle-truck.svg?url";
import busIcon from "../../../assets/icons/home/vehicle-bus.svg?url";
import otherIcon from "../../../assets/icons/home/vehicle-other.svg?url";
import pinIcon from "../../../assets/icons/home/map-pin.svg?url";
import swapIcon from "../../../assets/icons/home/swap-directions.svg?url";
import calendarIcon from "../../../assets/icons/home/calendar.svg?url";
import paymentIcon from "../../../assets/icons/home/fare-payment-card.svg?url";
import arrowIcon from "../../../assets/icons/home/arrow-right.svg?url";
import ticketLeft from "../../../assets/pages/home/tariffs/ticket-left.svg?url";
import ticketRight from "../../../assets/pages/home/tariffs/ticket-right.svg?url";
import ticketNotch from "../../../assets/pages/home/tariffs/ticket-notch.svg?url";
import styles from "./Tariffs.module.css";

type Locale = "ru" | "en";
type Label = Record<Locale, string>;
type Choice = { id: string; label: Label };
type Selection = { category: string; from: string; to: string; day: string; payment: string };

interface TariffConfig {
  version: number;
  currency: "RUB";
  road: Label;
  defaults: Selection & { period: string };
  categories: (Choice & { multiplier: number })[];
  stops: Choice[];
  days: (Choice & { multiplier: number })[];
  paymentMethods: (Choice & { discountPercent: number })[];
  periods: { id: string; start: string; end: string }[];
  segments: { from: string; to: string; prices: Record<string, number> }[];
}

interface Result {
  selection: Selection;
  discount: number;
  rows: { id: string; start: string; end: string; base: number; price: number }[];
}

const categoryIcons: Record<string, { src: string; width: number }> = {
  car: { src: carIcon, width: 44 },
  truck: { src: truckIcon, width: 48 },
  bus: { src: busIcon, width: 45 },
  other: { src: otherIcon, width: 37 },
};

const copy = {
  ru: {
    title: "Тарифы на проезд",
    categories: "Категория транспорта",
    from: "Откуда",
    to: "Куда",
    day: "День недели",
    payment: "Оплата",
    swap: "Сменить направление",
    calculate: "Рассчитать тариф",
    loading: "Загружаем тарифы…",
    loadError: "Не удалось загрузить тарифы.",
    retry: "Попробовать снова",
    calculateHint: "Рассчитайте тариф для выбранного маршрута.",
    sameStop: "Выберите разные пункты въезда и выезда.",
    periods: "Тарифы по времени въезда",
    price: "Стоимость проезда",
    basePrice: "Стоимость без скидки",
    discount: "Скидка",
    noScript: "Для расчёта тарифа включите JavaScript.",
  },
  en: {
    title: "Toll calculator",
    categories: "Vehicle category",
    from: "From",
    to: "To",
    day: "Day of the week",
    payment: "Payment",
    swap: "Swap direction",
    calculate: "Calculate toll",
    loading: "Loading tolls…",
    loadError: "Unable to load tolls.",
    retry: "Try again",
    calculateHint: "Calculate the toll for the selected route.",
    sameStop: "Choose different entry and exit points.",
    periods: "Tolls by entry time",
    price: "Toll",
    basePrice: "Price before discount",
    discount: "Discount",
    noScript: "Enable JavaScript to calculate the toll.",
  },
};

function validateConfig(value: unknown): TariffConfig {
  const config = value as TariffConfig;
  const invalid = () => { throw new Error("Invalid tariff configuration"); };
  const labelValid = (label: Label) => typeof label?.ru === "string" && Boolean(label.ru.trim())
    && typeof label?.en === "string" && Boolean(label.en.trim());
  if (!config || config.version !== 1 || config.currency !== "RUB"
    || !labelValid(config.road) || !config.defaults) invalid();

  const groups = [config.categories, config.stops, config.days, config.paymentMethods];
  for (const group of groups) {
    if (!Array.isArray(group) || !group.length) invalid();
    const ids = new Set<string>();
    for (const item of group) {
      if (!item || typeof item.id !== "string" || !item.id || ids.has(item.id) || !labelValid(item.label)) invalid();
      ids.add(item.id);
    }
  }
  if (config.stops.length < 2 || config.categories.some((item) => !Object.hasOwn(categoryIcons, item.id))) invalid();
  for (const item of [...config.categories, ...config.days]) {
    if (!Number.isFinite(item.multiplier) || item.multiplier <= 0 || item.multiplier > 100) invalid();
  }
  for (const item of config.paymentMethods) {
    if (!Number.isFinite(item.discountPercent) || item.discountPercent < 0 || item.discountPercent > 100) invalid();
  }

  if (!Array.isArray(config.periods) || !config.periods.length) invalid();
  const periodIds = new Set<string>();
  let endMinutes = 0;
  for (const period of config.periods) {
    if (!period || typeof period.id !== "string" || !period.id || periodIds.has(period.id)) invalid();
    const minutes = [period.start, period.end].map((time) => {
      if (typeof time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(time)) invalid();
      const [hour, minute] = time.split(":").map(Number);
      return hour * 60 + minute;
    });
    if (minutes[0] !== endMinutes || minutes[1] <= minutes[0] || minutes[1] > 1440) invalid();
    endMinutes = minutes[1];
    periodIds.add(period.id);
  }
  if (endMinutes !== 1440 || !Array.isArray(config.segments)
    || config.segments.length !== config.stops.length - 1) invalid();

  config.segments.forEach((segment, index) => {
    if (!segment || segment.from !== config.stops[index].id || segment.to !== config.stops[index + 1].id) invalid();
    for (const period of config.periods) {
      const price = segment.prices?.[period.id];
      if (!Number.isFinite(price) || price < 0 || price > 1_000_000) invalid();
    }
  });
  const defaults = config.defaults;
  if (!config.categories.some((item) => item.id === defaults.category)
    || !config.days.some((item) => item.id === defaults.day)
    || !config.paymentMethods.some((item) => item.id === defaults.payment)
    || !config.stops.some((item) => item.id === defaults.from)
    || !config.stops.some((item) => item.id === defaults.to)
    || defaults.from === defaults.to || !periodIds.has(defaults.period)) invalid();
  return config;
}

function calculate(config: TariffConfig, selection: Selection): Result {
  const fromIndex = config.stops.findIndex((stop) => stop.id === selection.from);
  const toIndex = config.stops.findIndex((stop) => stop.id === selection.to);
  const category = config.categories.find((item) => item.id === selection.category)!;
  const day = config.days.find((item) => item.id === selection.day)!;
  const payment = config.paymentMethods.find((item) => item.id === selection.payment)!;
  const segments = config.segments.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex));
  return {
    selection: { ...selection },
    discount: payment.discountPercent,
    rows: config.periods.map((period) => {
      // Sum in kopecks. Round after applying the route coefficients and then the discount.
      const sum = segments.reduce((total, segment) => total + Math.round(segment.prices[period.id] * 100), 0);
      const base = Math.round(sum * category.multiplier * day.multiplier);
      return { ...period, base, price: Math.round(base * (100 - payment.discountPercent) / 100) };
    }),
  };
}

interface TariffsProps {
  locale?: Locale;
  dataUrl?: string;
}

export default function Tariffs({
  locale = "ru",
  dataUrl = `${import.meta.env.BASE_URL}data/tariffs.json`,
}: TariffsProps) {
  const id = useId();
  const [config, setConfig] = useState<TariffConfig | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [periodId, setPeriodId] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [formError, setFormError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const text = copy[locale];

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    setConfig(null);
    void (async () => {
      try {
        const response = await fetch(dataUrl, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`Unable to load tariff data (${response.status})`);
        const data = validateConfig(await response.json());
        if (controller.signal.aborted) return;
        setSelection(data.defaults);
        setResult(calculate(data, data.defaults));
        setPeriodId(data.defaults.period);
        setConfig(data);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    })();
    return () => controller.abort();
  }, [dataUrl, attempt]);

  const updateSelection = (update: Partial<Selection>) => {
    setSelection((current) => current ? { ...current, ...update } : current);
    setResult(null);
    setFormError(false);
  };
  const currency = (kopecks: number) => new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency", currency: "RUB", currencyDisplay: "narrowSymbol", minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(kopecks / 100);
  const selectedRate = result?.rows.find((row) => row.id === periodId);
  const receiptFrom = config?.stops.find((stop) => stop.id === result?.selection.from)?.label[locale];
  const receiptTo = config?.stops.find((stop) => stop.id === result?.selection.to)?.label[locale];

  return (
    <section id="tariffs" class={styles.section} aria-labelledby={`${id}-title`} aria-busy={!config && !loadError}>
      <h2 id={`${id}-title`} class="sr-only">{text.title}</h2>
      <div class={styles.panels}>
        {config && selection ? (
          <>
            <form
              class={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                if (selection.from === selection.to) {
                  setFormError(true);
                  return;
                }
                setFormError(false);
                setResult(calculate(config, selection));
                setPeriodId(config.defaults.period);
              }}
            >
              <fieldset class={styles.categories}>
                <legend>{text.categories}</legend>
                <div class={styles.categoryList}>
                  {config.categories.map((category) => (
                    <label class={styles.category} key={category.id}>
                      <input
                        class="sr-only"
                        type="radio"
                        name={`${id}-category`}
                        value={category.id}
                        checked={selection.category === category.id}
                        onChange={() => updateSelection({ category: category.id })}
                      />
                      <span
                        class={styles.categoryIcon}
                        aria-hidden="true"
                        style={{ maskImage: `url("${categoryIcons[category.id].src}")`, "--vehicle-width": `${categoryIcons[category.id].width}px` }}
                      />
                      <span>{category.label[locale]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div class={styles.routeFields}>
                <label class={`${styles.field} ${styles.from}`}>
                  <span>{text.from}</span>
                  <span class={styles.select}>
                    <img src={pinIcon} alt="" />
                    <select
                      name="from"
                      value={selection.from}
                      onChange={(event) => updateSelection({ from: event.currentTarget.value })}
                      aria-invalid={formError || undefined}
                      aria-describedby={formError ? `${id}-error` : undefined}
                    >
                      {config.stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.label[locale]}</option>)}
                    </select>
                  </span>
                </label>

                <button
                  class={styles.swap}
                  type="button"
                  aria-label={text.swap}
                  onClick={() => updateSelection({ from: selection.to, to: selection.from })}
                >
                  <img src={swapIcon} alt="" />
                </button>

                <label class={`${styles.field} ${styles.to}`}>
                  <span>{text.to}</span>
                  <span class={styles.select}>
                    <img src={pinIcon} alt="" />
                    <select
                      name="to"
                      value={selection.to}
                      onChange={(event) => updateSelection({ to: event.currentTarget.value })}
                      aria-invalid={formError || undefined}
                      aria-describedby={formError ? `${id}-error` : undefined}
                    >
                      {config.stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.label[locale]}</option>)}
                    </select>
                  </span>
                </label>
              </div>

              <div class={styles.options}>
                <label class={styles.field}>
                  <span>{text.day}</span>
                  <span class={styles.select}>
                    <img src={calendarIcon} alt="" />
                    <select name="day" value={selection.day} onChange={(event) => updateSelection({ day: event.currentTarget.value })}>
                      {config.days.map((day) => <option key={day.id} value={day.id}>{day.label[locale]}</option>)}
                    </select>
                  </span>
                </label>
                <label class={styles.field}>
                  <span>{text.payment}</span>
                  <span class={styles.select}>
                    <img src={paymentIcon} alt="" />
                    <select name="payment" value={selection.payment} onChange={(event) => updateSelection({ payment: event.currentTarget.value })}>
                      {config.paymentMethods.map((payment) => <option key={payment.id} value={payment.id}>{payment.label[locale]}</option>)}
                    </select>
                  </span>
                </label>
              </div>

              {formError && <p id={`${id}-error`} class={styles.error} role="alert">{text.sameStop}</p>}
              <button class={styles.calculate} type="submit">
                {text.calculate}
                <img src={arrowIcon} alt="" />
              </button>
            </form>

            <div class={styles.ticket} aria-label={text.price}>
              {result && selectedRate ? (
                <>
                  <div class={styles.summary}>
                    <div class={styles.routeName}>
                      <span class={styles.road}>{config.road[locale]}</span>
                      <p>{receiptFrom} —<br />{receiptTo}</p>
                    </div>
                    <div class={styles.priceRow} aria-live="polite" aria-atomic="true">
                      <p class={styles.price} style={{ "--price-scale": Math.min(1, 6 / currency(selectedRate.price).length) }}>{currency(selectedRate.price)}</p>
                      {result.discount > 0 && selectedRate.base > 0 && (
                        <div class={styles.saving}>
                          <s aria-label={text.basePrice}>{currency(selectedRate.base)}</s>
                          <span class={styles.discount} aria-label={text.discount}>−{result.discount}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div class={styles.perforation} aria-hidden="true">
                    <img src={ticketNotch} width="26" height="26" alt="" />
                    <img src={ticketNotch} width="26" height="26" alt="" />
                  </div>
                  <div class={styles.desktopPerforation} aria-hidden="true">
                    <img src={ticketLeft} width="26" height="50" alt="" />
                    <span />
                    <img src={ticketRight} width="26" height="50" alt="" />
                  </div>
                  <ul class={styles.periods} aria-label={text.periods}>
                    {result.rows.map((row) => (
                      <li key={row.id}>
                        <button
                          class={styles.period}
                          type="button"
                          aria-pressed={row.id === periodId}
                          onClick={() => setPeriodId(row.id)}
                        >
                          <span>{row.start} — {row.end === "24:00" ? "00:00" : row.end}</span>
                          <strong>{currency(row.price)}</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div class={styles.resultHint}>
                  <div class={styles.resultLoader} aria-hidden="true">
                    <RoadLoader size="100%" locale={locale} />
                  </div>
                  <p role="status">{text.calculateHint}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div class={styles.unavailable} role="status">
            <p>{loadError ? text.loadError : text.loading}</p>
            {loadError && <button type="button" class={styles.calculate} onClick={() => setAttempt((current) => current + 1)}>{text.retry}</button>}
            <noscript>{text.noScript}</noscript>
          </div>
        )}
      </div>
    </section>
  );
}
