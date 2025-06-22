// src/routes/Home.tsx

import { Card, CardHeader, CardBody, Button } from "@heroui/react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="p-8">
      <Card className="max-w-xl mx-auto shadow-lg">
        <CardHeader>
          <h2 className="text-2xl font-semibold">Welcome Home</h2>
        </CardHeader>
        <CardBody>
          <p className="text-base leading-relaxed">
            This is the home page of your Tauri + React + HeroUI application.
            Use the menu above to navigate to different sections.
          </p>
        </CardBody>
      </Card>

      <Button color="primary" onPress={()=>navigate("/about")}>Go to about</Button>
    </div>
  );
}
