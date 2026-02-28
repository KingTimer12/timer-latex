import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Router from "@/router";
import '@/styles/global.css';
import { initTheme } from "@/hook/theme-store";

initTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <Router />
  </BrowserRouter>,
);
