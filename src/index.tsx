import React from "react";
import ReactDOM from "react-dom/client";

// import './fullcalendar.css';
import './index.css';
import "../src/fullcalendar.css";

import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The root element was not found in index.html.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

