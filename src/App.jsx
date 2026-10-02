import { useEffect } from "react";
import { supabase } from "./lib/supabase";

function App() {
  useEffect(() => {
    console.log("React + Supabase connected:", !!supabase);
  }, []);

  return (
    <main>
      <h1>PAPER.IO</h1>
      <p>React migration is working.</p>
    </main>
  );
}

export default App;