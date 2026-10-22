import { formatINR } from "./utils";

/**
 * Template-based reminder drafting. This stands in for an LLM call in the
 * prototype: tone shifts with how overdue the balance is, but nothing here
 * is a live AI inference — see the "Simulated" labels in the UI.
 */
export function generateReminderMessage(
  firstName: string,
  amount: number,
  daysOverdue: number
): string {
  const amt = formatINR(amount);

  if (daysOverdue < 10) {
    return `Namaste ${firstName} ji, hope you are doing well. Just a gentle reminder regarding the pending payment of ${amt} against your recent purchases. Whenever convenient, please let us know when we can expect the payment. Thank you!`;
  }

  if (daysOverdue < 18) {
    return `Namaste ${firstName} ji, I hope business is going well. This is a follow-up on the outstanding balance of ${amt}, which has been pending for about ${daysOverdue} days now. Could you please let us know a suitable date for the payment? We'd really appreciate it. Thank you for your continued business.`;
  }

  return `Namaste ${firstName} ji, I hope all is well. I wanted to personally follow up on the balance of ${amt}, which has now been outstanding for ${daysOverdue} days. We value our relationship and would appreciate it if this could be settled at the earliest convenience. Please do let us know if there's anything we can help clarify. Thank you.`;
}

export function firstNameOf(fullName: string): string {
  return fullName.split(" ")[0];
}
