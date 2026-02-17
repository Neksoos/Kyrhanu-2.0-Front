import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <div className="min-h-screen p-4 text-[--textMain]">
      <div className="max-w-md mx-auto spd-panel spd-frame p-4">
        <h1 className="text-2xl font-bold mb-2 text-outline-2">Прокляті Кургани</h1>
        <p className="text-sm opacity-80">Vite + React успішно запущено.</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);