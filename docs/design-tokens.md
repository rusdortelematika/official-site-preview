# Дизайн-токены РДТ

Переменные объявлены в [global.css](../src/styles/global.css). Astro подключает его в [SiteLayout.astro](../src/layouts/SiteLayout.astro).

Значения взяты из макетов Home, `/road`, `/rdt`, `/404` и `/maintenance` для Desktop, Tablet и Mobile. [Страница «Рабочая среда 2» в Figma](https://www.figma.com/design/Irn84iQY9iYUAq7xr3p41u/RDT?node-id=192-5568)

## Пороги адаптации

- Mobile — ширина меньше `768px`.
- Tablet — `768px ≤ ширина < 1024px`.
- Desktop — от `1024px`.

## Цвета

| Переменная | Значение | Назначение |
| --- | --- | --- |
| `--color-rdt-white` | `#ffffff` | Фон страницы, текст и иконки на цветных кнопках и тёмных карточках. |
| `--color-rdt-ink` | `#1d2d4d` | Заголовки, основной текст и тёмные поверхности карточек. |
| `--color-rdt-muted` | `#52617a` | Подписи, пояснения, метаданные и второстепенные элементы. |
| `--color-rdt-primary` | `#245daa` | Ссылки, контуры кнопок и фон действия «К документам» на /rdt. |
| `--color-rdt-action` | `#2868d9` | Выбранные элементы и показатели Home. |
| `--color-rdt-payment` | `#b23850` | Кнопки оплаты в шапке и тарифах, выделенный маршрут и акцентные карточки. |
| `--color-rdt-surface` | `#eef3fc` | Фон карточек, контактов, областей карты и выбранного языка. |
| `--color-rdt-border` | `#dce9fa` | Обводки, разделители, подложки иконок и элементов выбора. |
| `--color-rdt-discount` | `#dff9ef` | Зелёная подложка отметки о скидке в результате калькулятора. |
| `--color-rdt-status-ink` | `#0f1f31` | Заголовки «Страница не найдена» и «Технические работы». |
| `--color-rdt-status-muted` | `#435c71` | Поясняющий текст на /404 и /maintenance. |
| `--color-rdt-status-action` | `#086ca6` | Цифры 404 и кнопки «На главную» и «Обновить страницу». |

## Типографика

`--font-rdt` — `"Golos Text", system-ui, sans-serif`. Локальный [Golos Text](../src/assets/fonts/GolosText-Variable.ttf) поддерживает веса 400–900.

В ячейках указан размер шрифта и высота строки.

| Размер / высота строки | Mobile | Tablet | Desktop | Назначение |
| --- | --- | --- | --- | --- |
| `--text-rdt-small`<br>`--text-rdt-small--line-height` | `14px` / `20px` | `14px` / `20px` | `14px` / `20px` | Подписи, пометки и метаданные. Например, объём PDF. |
| `--text-rdt-body`<br>`--text-rdt-body--line-height` | `16px` / `24px` | `16px` / `24px` | `16px` / `24px` | Основной текст и метки. В макете обычно веса 400 и 500. |
| `--text-rdt-action`<br>`--text-rdt-action--line-height` | `14px` / `20px` | `16px` / `24px` | `20px` / `24px` | Ссылки и подписи кнопок. В макете обычно веса 500 и 600. |
| `--text-rdt-value`<br>`--text-rdt-value--line-height` | `24px` / `32px` | `24px` / `32px` | `24px` / `32px` | Выделенные значения. Например, телефоны и email в Desktop. |
| `--text-rdt-card`<br>`--text-rdt-card--line-height` | `20px` / `24px` | `21px` / `25px` | `28px` / `32px` | Заголовки карточек, например «ГИБДД». Обычно вес 700. |
| `--text-rdt-metric`<br>`--text-rdt-metric--line-height` | `22px` / `26px` | `26px` / `30px` | `32px` / `40px` | Показатели первого экрана Home, например «45 км». Вес 700. |
| `--text-rdt-title`<br>`--text-rdt-title--line-height` | `32px` / `40px` | `40px` / `48px` | `60px` / `64px` | Заголовки разделов Home. Обычно вес 700. |
| `--text-rdt-display`<br>`--text-rdt-display--line-height` | `56px` / `64px` | `64px` / `72px` | `80px` / `88px` | Крупные цифры. Шкала взята с /404, вес 800. |

Начертания из макета доступны через `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700) и `font-extrabold` (800).

Особые размеры, например для суммы тарифа и заголовков `/road`, задаются в стилях соответствующего компонента.

## Сетка и размеры

| Переменная | Mobile | Tablet | Desktop | Назначение |
| --- | --- | --- | --- | --- |
| `--container-rdt-content` | `1360px` | `1360px` | `1360px` | Максимальная ширина общего контейнера. |
| `--rdt-gutter` | `20px` | `32px` | `40px` | Боковые поля контейнера по версиям макета. |
| `--rdt-payment-height` | `44px` | `44px` | `48px` | Высота кнопки «Оплатить» в шапке. |
| `--rdt-field-height` | `48px` | `52px` | `56px` | Высота поля выбора в калькуляторе тарифа. |
| `--radius-rdt-small` | `8px` | `8px` | `8px` | Малое скругление. Например, выбранный язык и контролы карты. |
| `--radius-rdt-control` | `12px` | `12px` | `12px` | Скругление кнопок и полей ввода. |
| `--radius-rdt-panel` | `16px` | `16px` | `16px` | Скругление контактных карточек и компактных панелей. |
| `--radius-rdt-card-compact` | `20px` | `20px` | `20px` | Скругление компактных карточек, часто в Mobile. |
| `--radius-rdt-card` | `24px` | `24px` | `24px` | Скругление крупных карточек, формы и контейнера карты. |

На ширинах макета 390, 800 и 1440 px общая сетка даёт 350, 736 и 1360 px для контента. Для обычных отступов можно использовать шкалу Tailwind, например `gap-2`, `gap-4` и `gap-6`.

## Использование в Preact

В `PayButton.module.css` рядом с компонентом переменные доступны через `var()`.

```css
.payButton {
  font-family: var(--font-rdt);
  font-size: var(--text-rdt-action);
  line-height: var(--text-rdt-action--line-height);
  min-height: var(--rdt-payment-height);
  border-radius: var(--radius-rdt-control);
  color: var(--color-rdt-white);
  background: var(--color-rdt-payment);
}
```

```tsx
import styles from "./PayButton.module.css";

export function PayButton() {
  return <button type="button" class={styles.payButton}>Оплатить</button>;
}
```

Токены из `@theme static` доступны и как классы Tailwind, например `font-rdt`, `text-rdt-action`, `bg-rdt-payment`, `rounded-rdt-control` и `max-w-rdt-content`.
