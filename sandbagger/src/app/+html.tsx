import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Static-web HTML shell: felt to the edges, no white flash, app-like scroll. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Sandbagger — Golf Money Games</title>
        <meta
          name="description"
          content="Trust the card, not the player. Track every golf side game — skins, nassau, wolf, and the rest — and settle up in one tap."
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { height: 100%; background-color: #071d10; }
              body { overscroll-behavior: none; margin: 0; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
