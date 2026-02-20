"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InputGroup } from "@/components/ui/InputGroup";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async () => {
        setError("");
        setLoading(true);
        try {
            const { data, error: authError } = await authClient.signUp.email({
                name,
                email,
                password,
                callbackURL: "/dashboard",
            });

            if (authError) {
                setError(authError.message || "Registrasi gagal. Coba lagi.");
            } else {
                router.push("/dashboard");
            }
        } catch (err) {
            setError("Terjadi kesalahan. Coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError("");
        setLoading(true);
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/dashboard",
            });
        } catch (err) {
            setError("Google login gagal. Coba lagi.");
            setLoading(false);
        }
    };

    return (
        <div className="flex w-1/2 h-screen flex-col gap-4 border-r bg-surface-card border-border justify-center items-center">
            <div className="md:w-[500px] w-full flex gap-6 flex-col">
                <div className="flex flex-col gap-1 w-full">
                    <h1 className="text-2xl font-manrope font-bold text-white">Register</h1>
                    <p className="text-white/70 font-ibm-plex-mono text-xs uppercase">Create your account to get started</p>
                </div>

                {error && (
                    <div className="bg-red/10 border border-red/30 rounded-lg px-4 py-3 text-red text-sm font-ibm-plex-mono">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-2.5 w-full">
                    <InputGroup
                        title="Full Name"
                        leftIcon={<Image src="/icons/profile.svg" alt="Profile" width={16} height={16} />}
                        placeholder="e.g. Steve Jobs"
                        description="Your display name."
                        descriptionClassName="uppercase text-[12px] leading-5"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <InputGroup
                        title="Email"
                        leftIcon={<Image src="/icons/profile.svg" alt="Profile" width={16} height={16} />}
                        placeholder="e.g. steve.jobs@gmail.com"
                        description="We'll use this to contact you. We will not share your email with anyone else."
                        descriptionClassName="uppercase text-[12px] leading-5"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <InputGroup
                        title="Password"
                        leftIcon={<Image src="/icons/lock.svg" alt="Lock" width={16} height={16} />}
                        placeholder="Enter your password"
                        rightIcon={
                            <button onClick={() => setShowPassword(!showPassword)} type="button" className="focus:outline-none cursor-pointer">
                                <Image
                                    src={showPassword ? "/icons/eye-off.svg" : "/icons/eye.svg"}
                                    alt={showPassword ? "Hide Password" : "Show Password"}
                                    width={16}
                                    height={16}
                                />
                            </button>
                        }
                        type={showPassword ? "text" : "password"}
                        description="MUST BE AT LEAST 8 CHARACTERS LONG."
                        descriptionClassName="uppercase font-ibm-plex-mono text-[12px]"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <Button variant="white" onClick={handleRegister} disabled={loading}>
                    {loading ? "Creating account..." : "Register"}
                </Button>
                <div className="flex items-center gap-6">
                    <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-white/10"></div>
                    <p className="uppercase font-ibm-plex-mono text-xs text-white/70">Or continue with</p>
                    <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-white/10"></div>
                </div>
                <Button variant="primary" onClick={handleGoogleLogin} disabled={loading}>
                    Register with Google
                </Button>
                <div className="flex items-center justify-center gap-2">
                    <p className="text-white/70 font-ibm-plex-mono text-xs uppercase">Already have an account?</p>
                    <Link href="/login" className="text-white font-ibm-plex-mono text-xs uppercase underline">Login</Link>
                </div>
            </div>
        </div>
    )
}
