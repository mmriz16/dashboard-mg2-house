"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InputGroup } from "@/components/ui/InputGroup";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex w-1/2 h-screen flex-col gap-4 border-r bg-[#151618] border-white/10 justify-center items-center">
            <div className="md:w-[500px] w-full flex gap-6 flex-col">
                <div className="flex flex-col gap-1 w-full">
                    <h1 className="text-2xl font-manrope font-bold text-white">Login</h1>
                    <p className="text-white/70 font-ibm-plex-mono text-xs uppercase">Fill in the form below to login</p>
                </div>
                <div className="flex flex-col gap-6 w-full">
                    <InputGroup
                        title="Email"
                        leftIcon={<Image src="/icons/profile.svg" alt="Profile" width={16} height={16} />}
                        placeholder="e.g. steve.jobs@gmail.com"
                        description="We'll use this to contact you. We will not share your email with anyone else."
                        descriptionClassName="uppercase text-[12px] leading-5"
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
                    />
                    <Button variant="white">Login</Button>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-white/10"></div>
                        <p className="uppercase font-ibm-plex-mono text-xs text-white/70">Or continue with</p>
                        <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-white/10"></div>
                    </div>
                    <Button variant="primary">Login with Google</Button>
                </div>
            </div>
        </div>
    )
}