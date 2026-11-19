import chatIcon from "../../../assets/components/feedback-button/chat.svg?url";
import styles from "./FeedbackButton.module.css";

interface FeedbackButtonProps {
  locale?: "ru" | "en";
}

export function FeedbackButton({ locale = "ru" }: FeedbackButtonProps) {
  const label = locale === "ru" ? "Обратная связь" : "Feedback";

  return (
    <button
      class={styles.button}
      type="button"
      aria-label={label}
      aria-disabled="true"
      title={label}
    >
      <img src={chatIcon} width="36" height="36" alt="" />
    </button>
  );
}
