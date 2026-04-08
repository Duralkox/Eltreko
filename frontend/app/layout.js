import "./globals.css";
import RejestracjaSW from "../components/RejestracjaSW";

export const metadata = {
  title: "EltrekoAPP",
  description: "Wewnętrzny system protokołów i dokumentów technicznych",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/ikona-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (location.hostname === "localhost" && "serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs){
                  regs.forEach(function(r){ r.unregister(); });
                });
              }
            `
          }}
        />
      </head>
      <body>
        <RejestracjaSW />
        {children}
      </body>
    </html>
  );
}

