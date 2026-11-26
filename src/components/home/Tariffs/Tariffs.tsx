import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
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
import vehicleClasses from "../../../data/vehicle-classes.json";
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
    categories: "Класс транспорта",
    from: "Откуда",
    to: "Куда",
    day: "День недели",
    payment: "Оплата",
    swap: "Сменить направление",
    pay: "Перейти к оплате",
    loading: "Загружаем тарифы…",
    loadError: "Не удалось загрузить тарифы.",
    retry: "Попробовать снова",
    sameStop: "Выберите разные пункты въезда и выезда.",
    periods: "Тарифы по времени въезда",
    price: "Стоимость проезда",
    basePrice: "Стоимость без скидки",
    discount: "Скидка",
    noScript: "Для расчёта тарифа включите JavaScript.",
  },
  en: {
    title: "Toll calculator",
    categories: "Vehicle class",
    from: "From",
    to: "To",
    day: "Day of the week",
    payment: "Payment",
    swap: "Swap direction",
    pay: "Proceed to payment",
    loading: "Loading tolls…",
    loadError: "Unable to load tolls.",
    retry: "Try again",
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
  const [periodId, setPeriodId] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tooltip, setTooltip] = useState<{ category: string; placement: "top" | "bottom"; left: number; arrow: number } | null>(null);
  const hoveredCategory = useRef<string | null>(null);
  const focusedCategory = useRef<string | null>(null);
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
        setPeriodId(data.defaults.period);
        setConfig(data);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    })();
    return () => controller.abort();
  }, [dataUrl, attempt]);

  useEffect(() => {
    document.dispatchEvent(new CustomEvent("rdt:tariff-route-change"));
  }, [selection?.from, selection?.to, locale]);

  useEffect(() => {
    if (!tooltip) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setTooltip(null); };
    const close = () => setTooltip(null);
    document.addEventListener("keydown", dismiss);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", dismiss);
      window.removeEventListener("resize", close);
    };
  }, [tooltip?.category]);

  // Measure only the open popup, before paint. Closed popups use display:none
  // so their full width cannot enlarge the document on mobile Safari.
  useLayoutEffect(() => {
    if (!tooltip) return;
    const bubble = document.getElementById(`${id}-${tooltip.category}-description`);
    const option = bubble?.parentElement;
    if (!bubble || !option) return;
    const bounds = option.getBoundingClientRect();
    const width = bubble.offsetWidth, height = bubble.offsetHeight;
    const margin = 16, gap = 12;
    const above = bounds.top - margin - gap;
    const below = window.innerHeight - bounds.bottom - margin - gap;
    const left = Math.max(margin, Math.min(bounds.left + (bounds.width - width) / 2, window.innerWidth - width - margin)) - bounds.left;
    setTooltip({
      category: tooltip.category,
      placement: above >= height || above >= below ? "top" : "bottom",
      left,
      arrow: Math.max(16, Math.min(width - 16, bounds.width / 2 - left)),
    });
  }, [id, tooltip?.category, locale]);

  const showCategoryTooltip = (category: string, option: HTMLElement) => {
    if (!option.querySelector('[role="tooltip"]')) return;
    setTooltip((current) => current?.category === category ? current : {
      category, placement: "top", left: 0, arrow: 24,
    });
  };

  const updateSelection = (update: Partial<Selection>) => {
    setSelection((current) => current ? { ...current, ...update } : current);
  };
  // Derive the receipt from the current controls so it cannot lag behind the form.
  const result = useMemo(() => config && selection && selection.from !== selection.to
    ? calculate(config, selection) : null, [config, selection]);
  const formError = Boolean(config && selection && selection.from === selection.to);
  const currency = (kopecks: number) => new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency", currency: "RUB", currencyDisplay: "narrowSymbol", minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(kopecks / 100);
  const selectedRate = result?.rows.find((row) => row.id === periodId);
  const receiptFrom = config?.stops.find((stop) => stop.id === result?.selection.from)?.label[locale];
  const receiptTo = config?.stops.find((stop) => stop.id === result?.selection.to)?.label[locale];

  return (
    <section
      id="tariffs"
      class={styles.section}
      aria-labelledby={`${id}-title`}
      aria-busy={!config && !loadError}
      data-route-from={selection?.from}
      data-route-to={selection?.to}
      data-route-from-label={config?.stops.find(stop => stop.id === selection?.from)?.label[locale]}
      data-route-to-label={config?.stops.find(stop => stop.id === selection?.to)?.label[locale]}
    >
      <h2 id={`${id}-title`} class="sr-only">{text.title}</h2>
      <div class={styles.panels}>
        {config && selection ? (
          <>
            <form
              class={styles.form}
              onSubmit={(event) => event.preventDefault()}
            >
              <fieldset class={styles.categories}>
                <legend>{text.categories}</legend>
                <div class={styles.categoryList}>
                  {config.categories.map((category) => {
                    const vehicle = vehicleClasses.find((item) => item.category === category.id);
                    const tooltipId = vehicle ? `${id}-${category.id}-description` : undefined;
                    const isOpen = tooltip?.category === category.id;
                    return (
                      <div
                        class={styles.categoryOption}
                        key={category.id}
                        data-category={category.id}
                        data-tooltip-active={isOpen ? "" : undefined}
                        onPointerEnter={(event) => {
                          if (event.pointerType === "touch") return;
                          hoveredCategory.current = category.id;
                          showCategoryTooltip(category.id, event.currentTarget);
                        }}
                        onPointerLeave={() => {
                          hoveredCategory.current = null;
                          if (focusedCategory.current !== category.id) {
                            setTooltip((current) => current?.category === category.id ? null : current);
                          }
                        }}
                      >
                        <label class={styles.category}>
                          <input
                            class="sr-only"
                            type="radio"
                            name={`${id}-category`}
                            value={category.id}
                            checked={selection.category === category.id}
                            disabled={category.id === "other"}
                            aria-describedby={tooltipId}
                            onChange={() => updateSelection({ category: category.id })}
                            onFocus={(event) => {
                              if (!event.currentTarget.matches(":focus-visible")) return;
                              focusedCategory.current = category.id;
                              const option = event.currentTarget.parentElement?.parentElement;
                              if (option) showCategoryTooltip(category.id, option);
                            }}
                            onBlur={() => {
                              focusedCategory.current = null;
                              if (hoveredCategory.current !== category.id) {
                                setTooltip((current) => current?.category === category.id ? null : current);
                              }
                            }}
                          />
                          <span
                            class={styles.categoryIcon}
                            aria-hidden="true"
                            style={{ maskImage: `url("${categoryIcons[category.id].src}")`, "--vehicle-width": `${categoryIcons[category.id].width}px` }}
                          />
                          <span>{category.label[locale]}</span>
                        </label>
                        {vehicle && (
                          <span
                            id={tooltipId}
                            class={styles.categoryTooltip}
                            role="tooltip"
                            aria-hidden={!isOpen}
                            data-open={isOpen ? "true" : "false"}
                            data-placement={isOpen ? tooltip.placement : "top"}
                            style={isOpen ? { "--tooltip-left": `${tooltip.left}px`, "--tooltip-arrow": `${tooltip.arrow}px` } : undefined}
                          >
                            <strong>{category.label[locale]}</strong>
                            {vehicle.description[locale]}
                          </span>
                        )}
                      </div>
                    );
                  })}
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
              <button class={`${styles.actionButton} ${styles.paymentButton}`} type="button" disabled={!result}>
                {text.pay}
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
                  <p>{text.sameStop}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div class={styles.unavailable} role="status">
            <p>{loadError ? text.loadError : text.loading}</p>
            {loadError && <button type="button" class={styles.actionButton} onClick={() => setAttempt((current) => current + 1)}>{text.retry}</button>}
            <noscript>{text.noScript}</noscript>
          </div>
        )}
      </div>
    </section>
  );
}
