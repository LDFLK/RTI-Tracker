import { useAsgardeo } from "@asgardeo/react";
import { useEffect } from "react";
import { PreLoader } from "./PreLoader";

export function LoginRedirect() {
    const { signIn } = useAsgardeo();

    useEffect(() => {
        signIn();
    }, [signIn]);

    return <PreLoader message="Redirecting to Signin..." />;
}