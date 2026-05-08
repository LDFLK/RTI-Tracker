import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AsgardeoProvider } from '@asgardeo/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const ASGARDEO_CLIENT_ID = import.meta.env.VITE_ASGARDEO_CLIENT_ID;
const ASGARDEO_BASE_URL = import.meta.env.VITE_ASGARDEO_BASE_URL;

if (!ASGARDEO_CLIENT_ID || !ASGARDEO_BASE_URL) {
    console.error("Missing Asgardeo configuration. Please check your .env file.");
}

const queryClient = new QueryClient();

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
        <AsgardeoProvider
            clientId={ASGARDEO_CLIENT_ID}
            baseUrl={ASGARDEO_BASE_URL}
            scopes={["openid", "profile", "groups", "offline_access"]}
        >
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </AsgardeoProvider>
);