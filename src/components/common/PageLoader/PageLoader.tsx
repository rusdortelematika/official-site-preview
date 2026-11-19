import { useLayoutEffect, useState } from "preact/hooks";
import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import RoadLoader from "../RoadLoader/RoadLoader";
import styles from "./PageLoader.module.css";

export default function PageLoader() {
  const [visible, setVisible] = useState(false);
  const [locale, setLocale] = useState<"ru" | "en">("ru");

  useLayoutEffect(() => {
    let navigation: TransitionBeforePreparationEvent | undefined;
    let timer: number | undefined;
    let removeAbortListener: (() => void) | undefined;

    const updateLocale = () => setLocale(document.documentElement.lang === "en" ? "en" : "ru");
    const finish = (completed?: TransitionBeforePreparationEvent) => {
      if (completed && navigation !== completed) return;
      window.clearTimeout(timer);
      timer = undefined;
      removeAbortListener?.();
      removeAbortListener = undefined;
      navigation = undefined;
      setVisible(false);
    };

    const onPreparation = (event: TransitionBeforePreparationEvent) => {
      finish();
      if (event.signal.aborted || event.defaultPrevented) return;

      navigation = event;
      updateLocale();
      const abort = () => finish(event);
      event.signal.addEventListener("abort", abort, { once: true });
      removeAbortListener = () => event.signal.removeEventListener("abort", abort);
      timer = window.setTimeout(() => {
        if (event.signal.aborted || event.defaultPrevented) finish(event);
        else if (navigation === event) setVisible(true);
      }, 150);

      const load = event.loader;
      event.loader = async () => {
        try {
          await load();
        } catch (error) {
          finish(event);
          throw error;
        } finally {
          if (event.signal.aborted || event.defaultPrevented) finish(event);
        }
      };
    };

    const onPageLoad = () => {
      updateLocale();
      // An older navigation may finish while a newer page is still loading.
      if (!navigation || navigation.to.href === window.location.href) finish();
    };
    const onPageShow = () => {
      updateLocale();
      finish();
    };

    updateLocale();
    document.addEventListener("astro:before-preparation", onPreparation);
    document.addEventListener("astro:after-swap", updateLocale);
    document.addEventListener("astro:page-load", onPageLoad);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      finish();
      document.removeEventListener("astro:before-preparation", onPreparation);
      document.removeEventListener("astro:after-swap", updateLocale);
      document.removeEventListener("astro:page-load", onPageLoad);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  if (!visible) return null;

  return (
    <div class={styles.overlay} data-page-loader="" onWheel={event => event.preventDefault()}>
      <RoadLoader size={192} locale={locale} />
    </div>
  );
}
