import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AsgardeoProvider } from '@asgardeo/react'

const ASGARDEO_CLIENT_ID = import.meta.env.VITE_ASGARDEO_CLIENT_ID;
const ASGARDEO_BASE_URL = import.meta.env.VITE_ASGARDEO_BASE_URL;

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <AsgardeoProvider
        clientId={ASGARDEO_CLIENT_ID}
        baseUrl={ASGARDEO_BASE_URL}
    >
        <App />
    </AsgardeoProvider>

);