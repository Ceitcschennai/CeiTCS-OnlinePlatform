import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { LiveClassProvider } from "./contexts/LiveClassContext";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <LiveClassProvider>
      <App />
    </LiveClassProvider>
  </React.StrictMode>
);

reportWebVitals();
