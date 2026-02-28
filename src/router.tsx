import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Editor from "@/pages/Editor";

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:file" element={<Editor />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default Router;
