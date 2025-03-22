import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./components/Home";
import { resetSession } from "./utils/Store";
import Join from "./components/Join";

resetSession();

createRoot(document.getElementById("root")!).render(
  
  <BrowserRouter>
    <Routes>
      <Route index element={<Home />} />
      <Route path="join" element={<Join />} />
    </Routes>
  </BrowserRouter>
);
