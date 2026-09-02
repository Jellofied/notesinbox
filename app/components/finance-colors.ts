import type { FinanceType } from "@/lib/types";

export const financeMeta: Record<
  FinanceType,
  { label: string; bg: string; text: string }
> = {
  expense: {
    label: "Expense",
    bg: "bg-red",
    text: "text-black",
  },
  income: {
    label: "Income",
    bg: "bg-green",
    text: "text-black",
  },
};

export const financeOrder: FinanceType[] = ["expense", "income"];

export function getFinanceMeta(type: FinanceType) {
  return financeMeta[type];
}
