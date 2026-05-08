import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";

export function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
