import { createElement } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";

export function IntlWrapper({ children }: { children: React.ReactNode }) {
  return createElement(NextIntlClientProvider, { locale: "en", messages, children });
}
