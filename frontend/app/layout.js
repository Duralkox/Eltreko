import "./globals.css";
import RejestracjaSW from "../components/RejestracjaSW";

export const metadata = {
  title: "EltrekoAPP",
  description: "Wewnętrzny system protokołów i dokumentów technicznych",
  manifest: "/manifest.json"
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

