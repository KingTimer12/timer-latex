import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main>
      <h1>404 — Página não encontrada</h1>
      <Link to="/">Voltar ao início</Link>
    </main>
  );
}
