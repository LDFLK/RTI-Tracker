import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AsgardeoProvider } from '@asgardeo/react'
import { config } from './config';

const ASGARDEO_CLIENT_ID = config.ASGARDEO_CLIENT_ID;
const ASGARDEO_BASE_URL = config.ASGARDEO_BASE_URL;

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <AsgardeoProvider
        clientId={ASGARDEO_CLIENT_ID}
        baseUrl={ASGARDEO_BASE_URL}
        scopes={["openid", "profile", "groups", "offline_access"]}
        storage="sessionStorage"
    >
        <App />
    </AsgardeoProvider>
);