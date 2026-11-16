import "../style.css";

export const metadata = {
  title: "Tapri | Shared bill tracker",
  description: "Track shared tapri, cafe, and hangout bills with friends.",
  applicationName: "Tapri",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090b0d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}