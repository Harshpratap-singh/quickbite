import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppProvider } from "./context/AppContext.tsx";
import "leaflet/dist/leaflet.css";
import { SocketProvider } from "./context/SocketContext.tsx";

// export const authService = "http://localhost:5000";
// export const restaurantService = "http://localhost:5001";
// export const utilsService = "http://localhost:5002";
// export const realtimeService = "http://localhost:5004";
// export const riderService = "http://localhost:5005";
// export const adminService = "http://localhost:5006";
export const authService = "https://quickbite-auth-b3ix.onrender.com";
export const restaurantService = "https://quickbite-restaurant-x3vj.onrender.com";
export const utilsService = "https://quickbite-utils.onrender.com";
export const realtimeService = "https://quickbite-realtime.onrender.com";
export const riderService = "https://quickbite-rider.onrender.com";
export const adminService = "https://quickbite-admin-kbno.onrender.com";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="1028446561899-nh8pv98ilva4si2jl7v6mp8tfm5gtmhc.apps.googleusercontent.com">
      <AppProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
