'use client'

import React from 'react'
import { InputGroup } from '@/components/ui/InputGroup'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 font-manrope">
      {/* Outer Card */}
      <div className="w-full max-w-[440px] flex flex-col gap-8 bg-[#111214] p-10 rounded-[24px] border border-white/5 shadow-2xl">
        
        {/* Header Section */}
        <div className="flex flex-col gap-3">
          <h1 className="text-white font-bold text-3xl tracking-tight">
            Create an account
          </h1>
          <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.25em] leading-relaxed">
            Fill in the form below to create your account
          </p>
        </div>

        {/* Form Section */}
        <div className="flex flex-col gap-6">
          <InputGroup 
            title="Email Address"
            placeholder="e.g. steve.jobs@gmail.com"
            description="We'll use this to contact you. We will not share your email."
            rightIcon={
              <Image src="/icons/inbox.svg" alt="Email" width={18} height={18} className="opacity-20 group-focus-within:opacity-50 transition-opacity" />
            }
          />

          <InputGroup 
            title="Password"
            placeholder="Enter your password..."
            description="Must be at least 8 characters long."
            rightIcon={
              <Image src="/icons/lock.svg" alt="Lock" width={18} height={18} className="opacity-20 group-focus-within:opacity-50 transition-opacity" />
            }
          />

          <Button variant="white" className="w-full h-[48px] mt-4 shadow-xl shadow-white/5">
            Login
          </Button>
        </div>

        {/* Divider Section */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-[1px] bg-white/[0.03]" />
          <span className="text-white/10 font-mono text-[9px] uppercase tracking-[0.4em] whitespace-nowrap">
            Or continue with
          </span>
          <div className="flex-1 h-[1px] bg-white/[0.03]" />
        </div>

        {/* Social Login Section */}
        <Button variant="secondary" className="w-full h-[48px] gap-3 bg-[#151618] border-white/5" leftIcon={
          <Image src="/icons/globe.svg" alt="Google" width={18} height={18} className="opacity-40" />
        }>
          Login with Google
        </Button>

        {/* Footer Text */}
        <div className="flex flex-col gap-2 items-center mt-6">
          <p className="text-white/10 text-[10px] text-center max-w-[280px] leading-relaxed">
            By creating an account, you agree to our <span className="text-white/30 underline cursor-pointer">Terms and Conditions</span>.
          </p>
          <p className="text-white/30 text-[11px] font-medium mt-4 tracking-wide">
            Always your number one, till infinity and beyond! ✨
          </p>
        </div>
      </div>
    </main>
  )
}
